-- Eletrotécnico GO — release 013: registro interno de envio e resposta por versão.
-- Não envia mensagens, não prova a entrega e não gera OS/pagamentos.
CREATE TABLE gestao.orcamento_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL,
  versao integer NOT NULL CHECK (versao >= 1),
  tipo text NOT NULL CHECK (tipo IN ('envio','aprovacao','recusa')),
  canal text NOT NULL CHECK (canal IN ('whatsapp','email','telefone','presencial','outro')),
  evidencia text NOT NULL CHECK (length(btrim(evidencia)) BETWEEN 12 AND 500),
  ator_id uuid NOT NULL REFERENCES gestao.usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (orcamento_id,versao)
    REFERENCES gestao.orcamento_versoes(orcamento_id,versao),
  UNIQUE (orcamento_id,versao,tipo)
);
-- Impede decisões finais contraditórias, mesmo com escritas administrativas.
CREATE UNIQUE INDEX idx_orcamento_evento_decisao_unica
  ON gestao.orcamento_eventos (orcamento_id,versao)
  WHERE tipo IN ('aprovacao','recusa');
CREATE INDEX idx_orcamento_eventos_historico
  ON gestao.orcamento_eventos(orcamento_id,criado_em DESC);
REVOKE ALL ON gestao.orcamento_eventos FROM PUBLIC;

CREATE FUNCTION gestao.registrar_evento_orcamento(
  p_token text, p_orcamento_id uuid, p_versao integer,
  p_tipo text, p_canal text, p_evidencia text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_lead uuid;
  v_versao integer;
  v_status text;
  v_lead_status text;
  v_validade timestamptz;
  v_proximo text;
  v_lead_proximo text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$'
    OR p_orcamento_id IS NULL OR p_versao IS NULL OR p_versao < 1
    OR p_tipo IS NULL OR p_tipo NOT IN ('envio','aprovacao','recusa')
    OR p_canal IS NULL OR p_canal NOT IN ('whatsapp','email','telefone','presencial','outro')
    OR p_evidencia IS NULL OR length(btrim(p_evidencia)) NOT BETWEEN 12 AND 500
  THEN
    RETURN false;
  END IF;
  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
    AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN false; END IF;

  -- Trava a versão e o lead, mantendo ambas as transições na mesma transação.
  SELECT o.lead_id,o.versao_atual,o.status,l.status,v.validade_em
  INTO v_lead,v_versao,v_status,v_lead_status,v_validade
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  WHERE o.id=p_orcamento_id
  FOR UPDATE OF o,l;
  IF v_versao IS NULL OR v_versao <> p_versao THEN RETURN false; END IF;

  IF p_tipo='envio' THEN
    IF v_status <> 'rascunho' OR v_lead_status <> 'orcamento_em_preparo'
      OR v_validade IS NULL OR clock_timestamp() >= v_validade THEN RETURN false; END IF;
    v_proximo := 'enviado';
    v_lead_proximo := 'orcamento_enviado';
  ELSE
    IF v_status <> 'enviado' OR v_lead_status <> 'orcamento_enviado'
      OR NOT EXISTS (
        SELECT 1 FROM gestao.orcamento_eventos
        WHERE orcamento_id=p_orcamento_id AND versao=p_versao AND tipo='envio'
      ) THEN
      RETURN false;
    END IF;
    IF p_tipo='aprovacao' THEN
      IF v_validade IS NULL OR clock_timestamp() >= v_validade THEN RETURN false; END IF;
      v_proximo := 'aprovado';
      v_lead_proximo := 'aprovado';
    ELSE
      v_proximo := 'recusado';
      v_lead_proximo := 'recusado';
    END IF;
  END IF;

  INSERT INTO gestao.orcamento_eventos(orcamento_id,versao,tipo,canal,evidencia,ator_id)
  VALUES (p_orcamento_id,p_versao,p_tipo,p_canal,btrim(p_evidencia),v_ator);
  UPDATE gestao.orcamentos SET status=v_proximo WHERE id=p_orcamento_id;
  UPDATE gestao.leads SET status=v_lead_proximo WHERE id=v_lead;

  IF p_tipo='aprovacao' THEN
    -- Um aceite registrado por operador não é assinatura digital do cliente.
    UPDATE gestao.orcamento_versoes
    SET aprovado_em=clock_timestamp(),
        aprovado_por='Cliente (declaração registrada internamente)'
    WHERE orcamento_id=p_orcamento_id AND versao=p_versao;
  END IF;

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'orcamento',p_orcamento_id,'registrar_'||p_tipo,
    jsonb_build_object('lead_id',v_lead,'versao',p_versao,
      'anterior',v_status,'novo',v_proximo,'canal',p_canal));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text) FROM PUBLIC;

-- Remove o bypass da tela de solicitações para orçamentos já criados.
CREATE OR REPLACE FUNCTION gestao.alterar_status_lead(
  p_token text, p_lead_id uuid, p_status_esperado text, p_proximo_status text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_atual text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$'
    OR p_lead_id IS NULL OR p_status_esperado IS NULL OR p_proximo_status IS NULL
    OR p_status_esperado NOT IN (
      'novo','qualificado','orcamento_em_preparo','orcamento_enviado',
      'aprovado','recusado','perdido'
    )
    OR p_proximo_status NOT IN (
      'novo','qualificado','orcamento_em_preparo','orcamento_enviado',
      'aprovado','recusado','perdido'
    )
  THEN
    RETURN false;
  END IF;

  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
  WHERE s.token_hash = encode(public.digest(p_token, 'sha256'), 'hex')
    AND s.revogada_em IS NULL
    AND s.expira_em > clock_timestamp()
    AND u.ativo = true
    AND p.papel_codigo IN ('admin', 'comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN false; END IF;

  -- Serializa alterações simultâneas e rejeita formulário desatualizado.
  SELECT l.status INTO v_atual
  FROM gestao.leads l WHERE l.id = p_lead_id FOR UPDATE;
  IF v_atual IS NULL OR v_atual <> p_status_esperado THEN RETURN false; END IF;

  -- Quando já há orçamento, avanço para envio/decisão exige registro
  -- da versão exata em gestao.registrar_evento_orcamento.
  IF p_proximo_status IN ('orcamento_enviado','aprovado','recusado')
    AND EXISTS (SELECT 1 FROM gestao.orcamentos WHERE lead_id=p_lead_id)
  THEN
    RETURN false;
  END IF;

  IF NOT (
    (v_atual = 'novo' AND p_proximo_status IN ('qualificado','perdido'))
    OR (v_atual = 'qualificado' AND p_proximo_status IN ('orcamento_em_preparo','perdido'))
    OR (v_atual = 'orcamento_em_preparo' AND p_proximo_status IN ('orcamento_enviado','perdido'))
    OR (v_atual = 'orcamento_enviado' AND p_proximo_status IN ('aprovado','recusado','perdido'))
  ) THEN
    RETURN false;
  END IF;

  UPDATE gestao.leads
  SET status = p_proximo_status
  WHERE id = p_lead_id;

  INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes)
  VALUES (v_ator, 'lead', p_lead_id, 'alterar_status',
    jsonb_build_object('anterior', v_atual, 'novo', p_proximo_status));
  RETURN true;
END;
$$;


-- O CREATE OR REPLACE preserva os GRANTs da função antiga; reforça PUBLIC.
REVOKE ALL ON FUNCTION gestao.alterar_status_lead(text,uuid,text,text) FROM PUBLIC;

-- Consulta protegida do histórico dos últimos 100 orçamentos.
CREATE FUNCTION gestao.listar_eventos_orcamento_restritos(p_token text)
RETURNS TABLE(orcamento_id uuid,versao integer,tipo text,canal text,
              evidencia text,criado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_eventos_orcamento_restritos(text) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_eventos_orcamento_restritos(text) FROM gestao_convites;
  END IF;
END
$grants$;
 THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT e.orcamento_id,e.versao,e.tipo,e.canal,e.evidencia,e.criado_em
  FROM gestao.orcamento_eventos e
  WHERE e.orcamento_id IN (
    SELECT o.id FROM gestao.orcamentos o
    ORDER BY o.criado_em DESC,o.id DESC LIMIT 100
  )
  ORDER BY e.criado_em DESC,e.id DESC LIMIT 500;
END;
$;
REVOKE ALL ON FUNCTION gestao.listar_eventos_orcamento_restritos(text) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text) FROM gestao_convites;
  END IF;
END
$grants$;
