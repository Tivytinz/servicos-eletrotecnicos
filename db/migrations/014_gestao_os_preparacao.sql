-- Eletrotécnico GO — release 014: preparação de OS, SEM execução ou financeiro.
-- Os eventos 013 representam decisões RELATADAS, não aceite autenticado.
-- Reutiliza as tabelas ordens_servico/os_eventos existentes desde 001.
-- Uma OS de preparação nasce com status 'pendente', nunca 'aberta'.
CREATE FUNCTION gestao.criar_os_preparacao(
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
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
    AND u.ativo=true AND p.papel_codigo IN ('admin','tecnico')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN NULL; END IF;

  -- Protege contra duas preparações simultâneas da mesma proposta.
  SELECT o.versao_atual,o.status,l.status
  INTO v_atual,v_status,v_lead_status
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  WHERE o.id=p_orcamento_id FOR UPDATE OF o,l;

  IF v_atual IS NULL OR v_atual<>p_versao
    OR v_status<>'aprovado' OR v_lead_status<>'aprovado'
    OR NOT EXISTS (
      SELECT 1 FROM gestao.orcamento_versoes v
      WHERE v.orcamento_id=p_orcamento_id AND v.versao=p_versao
        AND v.aprovado_em IS NOT NULL
    )
    OR NOT EXISTS (
      SELECT 1 FROM gestao.orcamento_eventos e
      WHERE e.orcamento_id=p_orcamento_id AND e.versao=p_versao
        AND e.tipo='aprovacao'
        -- Dados de testes conhecidos jamais geram OS, nem de preparação.
        AND e.evidencia !~* '^[[:space:]]*teste[[:space:]]+interno'
    )
    OR EXISTS (SELECT 1 FROM gestao.ordens_servico os
               WHERE os.orcamento_id=p_orcamento_id)
  THEN RETURN NULL; END IF;

  INSERT INTO gestao.ordens_servico
    (orcamento_id,versao_aprovada,status)
  VALUES (p_orcamento_id,p_versao,'pendente')
  RETURNING id INTO v_id;

  INSERT INTO gestao.os_eventos
    (os_id,ator_id,status_anterior,status_novo,motivo)
  VALUES (v_id,v_ator,NULL,'pendente',
    'Preparação interna: aceite declarado pelo operador; comprovação do cliente pendente');

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'os',v_id,'criar_preparacao',
    jsonb_build_object('orcamento_id',p_orcamento_id,'versao',p_versao,
                       'status','pendente','aceite_verificado',false));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION gestao.criar_os_preparacao(text,uuid,integer) FROM PUBLIC;

-- Lista somente propostas aprovadas com decisão relatada não marcada como teste.
-- Sem acesso direto a tabelas de orçamento ou de OS pela role da aplicação.
CREATE FUNCTION gestao.listar_candidatas_os_preparacao_restritas(p_token text)
RETURNS TABLE(orcamento_id uuid,versao integer,cliente_nome text,
              valor_centavos bigint,descricao text,aprovado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','tecnico')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT o.id,o.versao_atual,c.nome,v.valor_centavos,v.descricao,v.aprovado_em
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.clientes c ON c.id=l.cliente_id
  JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  WHERE o.status='aprovado' AND l.status='aprovado'
    AND v.aprovado_em IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM gestao.orcamento_eventos e
      WHERE e.orcamento_id=o.id AND e.versao=o.versao_atual AND e.tipo='aprovacao'
        AND e.evidencia !~* '^[[:space:]]*teste[[:space:]]+interno'
    )
    AND NOT EXISTS (SELECT 1 FROM gestao.ordens_servico os WHERE os.orcamento_id=o.id)
  ORDER BY v.aprovado_em DESC,o.id DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_candidatas_os_preparacao_restritas(text) FROM PUBLIC;

-- As OS em preparação não são executáveis. Nesta release não existe action
-- nem função para mudar status, agendar, cobrar ou criar financeiro.
CREATE FUNCTION gestao.listar_os_preparacao_restritas(p_token text)
RETURNS TABLE(id uuid,orcamento_id uuid,versao integer,cliente_nome text,
              status text,valor_centavos bigint,criada_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','tecnico')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT os.id,os.orcamento_id,os.versao_aprovada,c.nome,
         os.status,v.valor_centavos,os.criada_em
  FROM gestao.ordens_servico os
  JOIN gestao.orcamentos o ON o.id=os.orcamento_id
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.clientes c ON c.id=l.cliente_id
  JOIN gestao.orcamento_versoes v
    ON v.orcamento_id=os.orcamento_id AND v.versao=os.versao_aprovada
  WHERE os.status='pendente'
  ORDER BY os.criada_em DESC,os.id DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_os_preparacao_restritas(text) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.criar_os_preparacao(text,uuid,integer) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_candidatas_os_preparacao_restritas(text) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_os_preparacao_restritas(text) TO gestao_app;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.criar_os_preparacao(text,uuid,integer) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_candidatas_os_preparacao_restritas(text) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_os_preparacao_restritas(text) FROM gestao_convites;
  END IF;
END
$grants$;
