-- ELETROTÉCNICO GO — PACOTE ATÔMICO 015: ACEITE PRIVADO POR LINK
-- Não executa automaticamente no deploy. Requer autorização operacional própria.
-- Sem backup recuperável por decisão de custo do responsável, risco residual real.
-- SHA-256 da migration: b4c34535fed84c4e2e2fb383d39603a4f74bc535cbb00baa058295533e2b8601
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $preflight$
BEGIN
  IF NOT pg_try_advisory_xact_lock(20261016,1) THEN
    RAISE EXCEPTION 'BLOQUEIO: outra migration em execução';
  END IF;
  IF current_database()<>'railway' OR current_user<>'postgres' THEN
    RAISE EXCEPTION 'BLOQUEIO: banco ou papel SQL incorreto';
  END IF;
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_catalog.pg_namespace WHERE nspname='gestao')<>current_user THEN
    RAISE EXCEPTION 'BLOQUEIO: schema não pertence ao executor';
  END IF;
  IF (SELECT count(*) FROM gestao.schema_migrations)<>14
    OR NOT EXISTS (SELECT 1 FROM gestao.schema_migrations
       WHERE versao='004_gestao_usuario_login.sql' AND checksum='fbf851c1265f500bf38ff3a04ce296563c089c24beadae30320d3d5a3bcc5799')
    OR NOT EXISTS (SELECT 1 FROM gestao.schema_migrations
       WHERE versao='014_gestao_os_preparacao.sql' AND checksum='664a1b70888140f61f2f2a0f815fd5f3859c2bbb1e61f6eaf27adce12c1ef402')
  THEN RAISE EXCEPTION 'BLOQUEIO: histórico e checksums anteriores não coincidem'; END IF;
  IF to_regclass('gestao.links_aceite_cliente') IS NOT NULL
    OR to_regprocedure('gestao.emitir_link_aceite_cliente(text,uuid,integer,text)') IS NOT NULL
    OR to_regprocedure('gestao.responder_link_aceite_cliente(text,text,boolean)') IS NOT NULL
  THEN RAISE EXCEPTION 'BLOQUEIO: 015 já presente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites')
    OR has_table_privilege('gestao_app','gestao.orcamentos','UPDATE')
    OR has_table_privilege('gestao_app','gestao.ordens_servico','INSERT')
    OR has_table_privilege('gestao_app','gestao.recebimentos','INSERT')
  THEN RAISE EXCEPTION 'BLOQUEIO: papéis ausentes ou grants excessivos'; END IF;
END
$preflight$;

-- Conteúdo integral da migration 015:
-- Eletrotécnico GO — release 015: link privado de manifestação direta sobre orçamento.
-- Token de 256 bits só existe no navegador/servidor no momento da emissão;
-- o PostgreSQL guarda exclusivamente SHA-256, sem telefone, IP ou user-agent.
-- Posse do link NÃO é prova de identidade nem assinatura eletrônica.
-- Nenhuma mensagem automática, OS executável, agendamento ou cobrança.

CREATE TABLE gestao.links_aceite_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL,
  versao integer NOT NULL CHECK (versao > 0),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  emitido_por uuid NOT NULL REFERENCES gestao.usuarios(id),
  emitido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  expira_em timestamptz NOT NULL,
  revogado_em timestamptz,
  utilizado_em timestamptz,
  resposta text CHECK (resposta IN ('aprovacao','recusa')),
  FOREIGN KEY (orcamento_id,versao)
    REFERENCES gestao.orcamento_versoes(orcamento_id,versao),
  CONSTRAINT uso_coerente CHECK (
    (utilizado_em IS NULL AND resposta IS NULL)
    OR (utilizado_em IS NOT NULL AND resposta IS NOT NULL)
  ),
  CONSTRAINT revogacao_e_uso_exclusivos CHECK (
    revogado_em IS NULL OR utilizado_em IS NULL
  ),
  CONSTRAINT expiracao_posterior CHECK (expira_em > emitido_em)
);
CREATE UNIQUE INDEX idx_link_aceite_ativo
  ON gestao.links_aceite_cliente(orcamento_id,versao)
  WHERE revogado_em IS NULL AND utilizado_em IS NULL;
CREATE INDEX idx_link_aceite_orcamento
  ON gestao.links_aceite_cliente(orcamento_id,emitido_em DESC);
REVOKE ALL ON gestao.links_aceite_cliente FROM PUBLIC;

-- Emite só para proposta ENVIADA e ainda válida, com envio efetivamente
-- registrado; uma referência marcada TESTE INTERNO nunca se torna convite real.
CREATE FUNCTION gestao.emitir_link_aceite_cliente(
  p_sessao text,p_orcamento uuid,p_versao integer,p_hash text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_ator uuid; v_atual integer; v_status text; v_lead_status text;
  v_validade timestamptz; v_id uuid; v_agora timestamptz;
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$'
    OR p_orcamento IS NULL OR p_versao IS NULL OR p_versao<1
    OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
  THEN RETURN NULL; END IF;
  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
    AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN NULL; END IF;

  SELECT o.versao_atual,o.status,l.status,v.validade_em
    INTO v_atual,v_status,v_lead_status,v_validade
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v
    ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  WHERE o.id=p_orcamento FOR UPDATE OF o,l;
  v_agora := clock_timestamp();
  IF v_atual IS NULL OR v_atual<>p_versao
    OR v_status<>'enviado' OR v_lead_status<>'orcamento_enviado'
    OR v_validade IS NULL OR v_validade <= v_agora + interval '1 minute'
    OR NOT EXISTS (
      SELECT 1 FROM gestao.orcamento_eventos e
      WHERE e.orcamento_id=p_orcamento AND e.versao=p_versao
        AND e.tipo='envio'
        AND e.evidencia !~* '^[[:space:]]*teste[[:space:]]+interno'
    )
  THEN RETURN NULL; END IF;

  -- Reemissão invalida a anterior na mesma transação; não há duas válidas.
  UPDATE gestao.links_aceite_cliente
  SET revogado_em=v_agora
  WHERE orcamento_id=p_orcamento AND versao=p_versao
    AND utilizado_em IS NULL AND revogado_em IS NULL;

  INSERT INTO gestao.links_aceite_cliente
    (orcamento_id,versao,token_hash,emitido_por,emitido_em,expira_em)
  VALUES (p_orcamento,p_versao,p_hash,v_ator,v_agora,
          LEAST(v_agora + interval '24 hours',v_validade))
  RETURNING id INTO v_id;

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'orcamento',p_orcamento,'emitir_link_aceite',
    jsonb_build_object('versao',p_versao,'link_id',v_id,'expira_em',
                       LEAST(v_agora + interval '24 hours',v_validade)));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION gestao.emitir_link_aceite_cliente(text,uuid,integer,text) FROM PUBLIC;

CREATE FUNCTION gestao.revogar_link_aceite_cliente(
  p_sessao text,p_orcamento uuid,p_versao integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE v_ator uuid; v_atual integer; v_qtd integer;
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$'
    OR p_orcamento IS NULL OR p_versao IS NULL OR p_versao<1
  THEN RETURN false; END IF;
  SELECT u.id INTO v_ator FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
    AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN false; END IF;

  SELECT versao_atual INTO v_atual FROM gestao.orcamentos
  WHERE id=p_orcamento FOR UPDATE;
  IF v_atual IS NULL OR v_atual<>p_versao THEN RETURN false; END IF;

  UPDATE gestao.links_aceite_cliente SET revogado_em=clock_timestamp()
  WHERE orcamento_id=p_orcamento AND versao=p_versao
    AND utilizado_em IS NULL AND revogado_em IS NULL;
  GET DIAGNOSTICS v_qtd=ROW_COUNT;
  IF v_qtd=0 THEN RETURN false; END IF;
  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'orcamento',p_orcamento,'revogar_link_aceite',
          jsonb_build_object('versao',p_versao));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION gestao.revogar_link_aceite_cliente(text,uuid,integer) FROM PUBLIC;

-- Consulta pública somente a apresentação da versão vinculada ao hash secreto.
-- Qualquer GET da página não consome o link; bots de pré-visualização não aprovam.
CREATE FUNCTION gestao.consultar_link_aceite_cliente(p_hash text)
RETURNS TABLE(versao integer,valor_centavos bigint,descricao text,validade_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RETURN; END IF;
  RETURN QUERY
  SELECT v.versao,v.valor_centavos,v.descricao,v.validade_em
  FROM gestao.links_aceite_cliente a
  JOIN gestao.orcamentos o ON o.id=a.orcamento_id
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v ON v.orcamento_id=a.orcamento_id
    AND v.versao=a.versao
  WHERE a.token_hash=p_hash AND a.revogado_em IS NULL
    AND a.utilizado_em IS NULL AND clock_timestamp()<a.expira_em
    AND o.status='enviado' AND l.status='orcamento_enviado'
    AND o.versao_atual=a.versao
    AND v.validade_em IS NOT NULL AND clock_timestamp()<v.validade_em
  LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION gestao.consultar_link_aceite_cliente(text) FROM PUBLIC;

-- A resposta é uma operação atômica e de uso único. Uma nova tentativa
-- após consumo/expiração/revogação ou conflito de status falha fechada.
CREATE FUNCTION gestao.responder_link_aceite_cliente(
  p_hash text,p_resposta text,p_leu_condicoes boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_orcamento uuid; v_lead uuid; v_atual integer; v_status text;
  v_lead_status text; v_validade timestamptz;
  v_link gestao.links_aceite_cliente%ROWTYPE;
  v_agora timestamptz; v_status_novo text;
BEGIN
  IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
    OR p_resposta IS NULL OR p_resposta NOT IN ('aprovacao','recusa')
    OR p_leu_condicoes IS DISTINCT FROM true
  THEN RETURN false; END IF;

  -- A ordem dos locks coincide com emissão e revogação: orçamento, depois link.
  SELECT a.orcamento_id INTO v_orcamento
  FROM gestao.links_aceite_cliente a WHERE a.token_hash=p_hash;
  IF v_orcamento IS NULL THEN RETURN false; END IF;

  SELECT o.lead_id,o.versao_atual,o.status,l.status,v.validade_em
    INTO v_lead,v_atual,v_status,v_lead_status,v_validade
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v
    ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  WHERE o.id=v_orcamento FOR UPDATE OF o,l;

  SELECT * INTO v_link
  FROM gestao.links_aceite_cliente a
  WHERE a.token_hash=p_hash FOR UPDATE;
  v_agora := clock_timestamp();
  IF v_atual IS NULL OR v_link.id IS NULL
    OR v_link.versao<>v_atual OR v_link.revogado_em IS NOT NULL
    OR v_link.utilizado_em IS NOT NULL OR v_agora>=v_link.expira_em
    OR v_validade IS NULL OR v_agora>=v_validade
    OR v_status<>'enviado' OR v_lead_status<>'orcamento_enviado'
  THEN RETURN false; END IF;

  v_status_novo := CASE WHEN p_resposta='aprovacao' THEN 'aprovado' ELSE 'recusado' END;

  UPDATE gestao.links_aceite_cliente
  SET utilizado_em=v_agora,resposta=p_resposta WHERE id=v_link.id;
  UPDATE gestao.orcamentos SET status=v_status_novo WHERE id=v_orcamento;
  UPDATE gestao.leads SET status=v_status_novo WHERE id=v_lead;
  IF p_resposta='aprovacao' THEN
    UPDATE gestao.orcamento_versoes
    SET aprovado_em=v_agora,
        aprovado_por='Detentor do link privado (identidade não verificada)'
    WHERE orcamento_id=v_orcamento AND versao=v_atual;
  END IF;

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (NULL,'orcamento',v_orcamento,'resposta_link_cliente',
    jsonb_build_object('versao',v_atual,'resposta',p_resposta,
      'link_id',v_link.id,'identidade_verificada',false));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION gestao.responder_link_aceite_cliente(text,text,boolean) FROM PUBLIC;

CREATE FUNCTION gestao.listar_links_aceite_cliente_restritos(p_sessao text)
RETURNS TABLE(orcamento_id uuid,versao integer,emitido_em timestamptz,
  expira_em timestamptz,revogado_em timestamptz,
  utilizado_em timestamptz,resposta text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  ) THEN RETURN; END IF;
  RETURN QUERY
  SELECT a.orcamento_id,a.versao,a.emitido_em,a.expira_em,
         a.revogado_em,a.utilizado_em,a.resposta
  FROM gestao.links_aceite_cliente a
  WHERE a.orcamento_id IN (
    SELECT o.id FROM gestao.orcamentos o
    ORDER BY o.criado_em DESC,o.id DESC LIMIT 100
  )
  ORDER BY a.emitido_em DESC,a.id DESC LIMIT 300;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_links_aceite_cliente_restritos(text) FROM PUBLIC;

-- A OS 014 passa a aceitar também a decisão registrada pelo detentor do link,
-- mas continua SOMENTE 'pendente', sem validar identidade, execução ou pagamento.
CREATE OR REPLACE FUNCTION gestao.criar_os_preparacao(
  p_token text, p_orcamento_id uuid, p_versao integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_atual integer;
  v_status text;
  v_lead_status text;
  v_id uuid;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$'
    OR p_orcamento_id IS NULL OR p_versao IS NULL OR p_versao < 1
  THEN RETURN NULL; END IF;
  SELECT u.id INTO v_ator
  FROM gestao.sessoes s JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
    AND u.ativo=true AND p.papel_codigo IN ('admin','tecnico')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN NULL; END IF;

  SELECT o.versao_atual,o.status,l.status
  INTO v_atual,v_status,v_lead_status
  FROM gestao.orcamentos o JOIN gestao.leads l ON l.id=o.lead_id
  WHERE o.id=p_orcamento_id FOR UPDATE OF o,l;

  IF v_atual IS NULL OR v_atual<>p_versao
    OR v_status<>'aprovado' OR v_lead_status<>'aprovado'
    OR NOT EXISTS (
      SELECT 1 FROM gestao.orcamento_versoes v
      WHERE v.orcamento_id=p_orcamento_id AND v.versao=p_versao
        AND v.aprovado_em IS NOT NULL
    )
    OR NOT (
      EXISTS (
        SELECT 1 FROM gestao.orcamento_eventos e
        WHERE e.orcamento_id=p_orcamento_id AND e.versao=p_versao
          AND e.tipo='aprovacao'
          AND e.evidencia !~* '^[[:space:]]*teste[[:space:]]+interno'
      )
      OR EXISTS (
        SELECT 1 FROM gestao.links_aceite_cliente a
        WHERE a.orcamento_id=p_orcamento_id AND a.versao=p_versao
          AND a.resposta='aprovacao' AND a.utilizado_em IS NOT NULL
      )
    )
    OR EXISTS (SELECT 1 FROM gestao.ordens_servico os
               WHERE os.orcamento_id=p_orcamento_id)
  THEN RETURN NULL; END IF;

  INSERT INTO gestao.ordens_servico(orcamento_id,versao_aprovada,status)
  VALUES (p_orcamento_id,p_versao,'pendente') RETURNING id INTO v_id;
  INSERT INTO gestao.os_eventos(os_id,ator_id,status_anterior,status_novo,motivo)
  VALUES (v_id,v_ator,NULL,'pendente',
    'Preparação interna: aceite relatado ou por link; identidade não verificada');
  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'os',v_id,'criar_preparacao',
    jsonb_build_object('orcamento_id',p_orcamento_id,'versao',p_versao,
                       'status','pendente','identidade_verificada',false));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION gestao.criar_os_preparacao(text,uuid,integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION gestao.listar_candidatas_os_preparacao_restritas(p_token text)
RETURNS TABLE(orcamento_id uuid,versao integer,cliente_nome text,
              valor_centavos bigint,descricao text,aprovado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','tecnico')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT o.id,o.versao_atual,c.nome,v.valor_centavos,v.descricao,v.aprovado_em
  FROM gestao.orcamentos o JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.clientes c ON c.id=l.cliente_id
  JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  WHERE o.status='aprovado' AND l.status='aprovado'
    AND v.aprovado_em IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM gestao.orcamento_eventos e
        WHERE e.orcamento_id=o.id AND e.versao=o.versao_atual
          AND e.tipo='aprovacao'
          AND e.evidencia !~* '^[[:space:]]*teste[[:space:]]+interno'
      )
      OR EXISTS (
        SELECT 1 FROM gestao.links_aceite_cliente a
        WHERE a.orcamento_id=o.id AND a.versao=o.versao_atual
          AND a.resposta='aprovacao' AND a.utilizado_em IS NOT NULL
      )
    )
    AND NOT EXISTS (SELECT 1 FROM gestao.ordens_servico os WHERE os.orcamento_id=o.id)
  ORDER BY v.aprovado_em DESC,o.id DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_candidatas_os_preparacao_restritas(text) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.emitir_link_aceite_cliente(text,uuid,integer,text) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.revogar_link_aceite_cliente(text,uuid,integer) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.consultar_link_aceite_cliente(text) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.responder_link_aceite_cliente(text,text,boolean) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_links_aceite_cliente_restritos(text) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.emitir_link_aceite_cliente(text,uuid,integer,text) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.revogar_link_aceite_cliente(text,uuid,integer) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.consultar_link_aceite_cliente(text) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.responder_link_aceite_cliente(text,text,boolean) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_links_aceite_cliente_restritos(text) FROM gestao_convites;
  END IF;
END
$grants$;


INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('015_gestao_link_aceite_cliente.sql','b4c34535fed84c4e2e2fb383d39603a4f74bc535cbb00baa058295533e2b8601');

DO $postflight$
BEGIN
  IF (SELECT count(*) FROM gestao.schema_migrations)<>15
    OR NOT EXISTS (SELECT 1 FROM gestao.schema_migrations
      WHERE versao='015_gestao_link_aceite_cliente.sql' AND checksum='b4c34535fed84c4e2e2fb383d39603a4f74bc535cbb00baa058295533e2b8601')
    OR NOT has_function_privilege('gestao_app',
      'gestao.emitir_link_aceite_cliente(text,uuid,integer,text)','EXECUTE')
    OR NOT has_function_privilege('gestao_app',
      'gestao.revogar_link_aceite_cliente(text,uuid,integer)','EXECUTE')
    OR NOT has_function_privilege('gestao_app',
      'gestao.consultar_link_aceite_cliente(text)','EXECUTE')
    OR NOT has_function_privilege('gestao_app',
      'gestao.responder_link_aceite_cliente(text,text,boolean)','EXECUTE')
    OR NOT has_function_privilege('gestao_app',
      'gestao.listar_links_aceite_cliente_restritos(text)','EXECUTE')
    OR has_function_privilege('gestao_convites',
      'gestao.responder_link_aceite_cliente(text,text,boolean)','EXECUTE')
    OR has_table_privilege('gestao_app','gestao.links_aceite_cliente','SELECT')
    OR has_table_privilege('gestao_app','gestao.links_aceite_cliente','INSERT')
    OR has_table_privilege('gestao_app','gestao.orcamentos','UPDATE')
    OR has_table_privilege('gestao_app','gestao.recebimentos','INSERT')
  THEN RAISE EXCEPTION 'BLOQUEIO: validação de 015 falhou'; END IF;
END
$postflight$;
COMMIT;
-- Depois: verificar 15/15, flags desativadas e QA apenas em banco descartável.
