-- ELETROTÉCNICO GO — RELEASE ATÔMICO 010 (FUNIL DE SOLICITAÇÕES)
-- Operação manual de produção. Não é executada pelo deploy Railway.
-- Sem backup recuperável: o responsável deve ponderar risco antes de aplicar.
-- Executar arquivo INTEIRO com: psql -X -v ON_ERROR_STOP=1 -U postgres -d railway -f <arquivo>
-- Uma única transação: falha antes de COMMIT provoca ROLLBACK.
-- Migration original: db/migrations/010_gestao_status_leads.sql
-- SHA-256 da migration original: 2c9a9d85cf1fb4acbbee515eef396916c1e27a49c655ddfae28eed4eebad56ba
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF NOT pg_try_advisory_xact_lock(20261016,1) THEN
    RAISE EXCEPTION 'BLOQUEIO: outra migration está em execução';
  END IF;
  IF current_database() <> 'railway' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'BLOQUEIO: banco ou role SQL incorreta';
  END IF;
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='gestao') <> current_user THEN
    RAISE EXCEPTION 'BLOQUEIO: SQL role não é proprietária do schema gestao';
  END IF;
  IF (SELECT count(*) FROM gestao.schema_migrations) <> 9
    OR NOT EXISTS (SELECT 1 FROM gestao.schema_migrations
      WHERE versao='009_gestao_aceite_verificado.sql') THEN
    RAISE EXCEPTION 'BLOQUEIO: estado esperado 001-009 incompleto ou divergente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='gestao_app')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='gestao_convites') THEN
    RAISE EXCEPTION 'BLOQUEIO: roles dedicadas não encontradas';
  END IF;
  IF to_regprocedure('gestao.alterar_status_lead(text,uuid,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'BLOQUEIO: função já existe; impedir reaplicação';
  END IF;
  IF has_table_privilege('gestao_app','gestao.leads','UPDATE') THEN
    RAISE EXCEPTION 'BLOQUEIO: role app possui UPDATE direto em leads';
  END IF;
END
$preflight$;

-- Conteúdo integral da migration 010
-- Eletrotécnico GO — evolução segura do funil comercial.
-- Sem novos objetos de dados: usa gestao.leads, sessoes e auditoria existentes.
-- Nunca conceder UPDATE em gestao.leads nem INSERT em gestao.auditoria à role web.
-- A função revalida sessão, papel e transição no banco; atualiza e audita atomicamente.
CREATE FUNCTION gestao.alterar_status_lead(
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

-- PostgreSQL concede EXECUTE a PUBLIC por padrão; negar explicitamente.
REVOKE ALL ON FUNCTION gestao.alterar_status_lead(text,uuid,text,text) FROM PUBLIC;

-- No CI a role gestao_app é provisionada DEPOIS das migrations;
-- em produção ela já existe. Ambos os caminhos são cobertos.
DO $role$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.alterar_status_lead(text,uuid,text,text) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.alterar_status_lead(text,uuid,text,text) FROM gestao_convites;
  END IF;
END
$role$;

INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('010_gestao_status_leads.sql','2c9a9d85cf1fb4acbbee515eef396916c1e27a49c655ddfae28eed4eebad56ba');

DO $postflight$
BEGIN
  IF NOT has_function_privilege('gestao_app',
    'gestao.alterar_status_lead(text,uuid,text,text)','EXECUTE')
    OR has_function_privilege('gestao_convites',
    'gestao.alterar_status_lead(text,uuid,text,text)','EXECUTE')
    OR has_table_privilege('gestao_app','gestao.leads','UPDATE')
    OR has_table_privilege('gestao_app','gestao.auditoria','INSERT')
    OR NOT EXISTS (SELECT 1 FROM gestao.schema_migrations
    WHERE versao='010_gestao_status_leads.sql' AND checksum='2c9a9d85cf1fb4acbbee515eef396916c1e27a49c655ddfae28eed4eebad56ba')
  THEN
    RAISE EXCEPTION 'BLOQUEIO: grants, papéis ou checksum incorretos';
  END IF;
END
$postflight$;

COMMIT;
-- Verificar migrações 10/10 antes de ativar GESTAO_STATUS_HABILITADO=true.
