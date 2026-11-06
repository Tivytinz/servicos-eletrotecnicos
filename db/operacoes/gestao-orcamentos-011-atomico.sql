-- ELETROTÉCNICO GO — RELEASE MANUAL ATÔMICO 011 (RASCUNHOS DE ORÇAMENTO)
-- Operação de produção com risco: NÃO executada pelo CI, build ou Railway.
-- SEM BACKUP recuperável: aplicar só com decisão operacional informada.
-- Executar arquivo INTEIRO: psql -X -v ON_ERROR_STOP=1 -U postgres -d railway -f <caminho>
-- Migration: db/migrations/011_gestao_orcamento_rascunho.sql
-- SHA256: f693e6d06891898e2dbcb38049a2b9005113e1fa9dd7cf3b277203943b6f18ef
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF NOT pg_try_advisory_xact_lock(20261016,1) THEN
    RAISE EXCEPTION 'BLOQUEIO: outra migration em andamento';
  END IF;
  IF current_database() <> 'railway' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'BLOQUEIO: conexão não administrativa em railway';
  END IF;
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='gestao') <> current_user THEN
    RAISE EXCEPTION 'BLOQUEIO: role não é dona do schema gestao';
  END IF;
  IF (SELECT count(*) FROM gestao.schema_migrations) <> 10
    OR NOT EXISTS(SELECT 1 FROM gestao.schema_migrations
      WHERE versao='010_gestao_status_leads.sql'
        AND checksum='2c9a9d85cf1fb4acbbee515eef396916c1e27a49c655ddfae28eed4eebad56ba') THEN
    RAISE EXCEPTION 'BLOQUEIO: 001–010 não estão íntegros';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gestao_app')
    OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gestao_convites') THEN
    RAISE EXCEPTION 'BLOQUEIO: roles SQL dedicadas ausentes';
  END IF;
  IF to_regprocedure('gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)') IS NOT NULL
    OR to_regprocedure('gestao.listar_orcamentos_restritos(text)') IS NOT NULL THEN
    RAISE EXCEPTION 'BLOQUEIO: funções 011 já existem; não reaplicar';
  END IF;
  IF has_table_privilege('gestao_app','gestao.orcamentos','INSERT')
    OR has_table_privilege('gestao_app','gestao.orcamento_versoes','INSERT')
    OR has_table_privilege('gestao_app','gestao.orcamentos','SELECT') THEN
    RAISE EXCEPTION 'BLOQUEIO: app possui privilégios excessivos sobre orçamentos';
  END IF;
END
$preflight$;

-- Conteúdo integral imutável da migration 011:
-- Eletrotécnico GO — orçamentos iniciais: criação e consulta sem SELECT/INSERT diretos.
-- O envio, aprovação e novas versões serão entregues em etapas posteriores.
-- Requer gestao.sessoes, gestao.orcamentos e gestao.orcamento_versoes já existentes.
CREATE FUNCTION gestao.criar_orcamento_rascunho(
  p_token text, p_lead_id uuid, p_valor_centavos bigint,
  p_descricao text, p_validade date
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_estado text;
  v_id uuid;
  v_hoje date := (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$'
    OR p_lead_id IS NULL
    OR p_valor_centavos IS NULL OR p_valor_centavos < 1
    OR p_valor_centavos > 9999999999
    OR p_descricao IS NULL OR length(btrim(p_descricao)) NOT BETWEEN 10 AND 4000
    OR p_validade IS NULL OR p_validade < v_hoje OR p_validade > v_hoje + 180
  THEN
    RETURN NULL;
  END IF;

  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
  WHERE s.token_hash = encode(public.digest(p_token,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
    AND u.ativo = true AND p.papel_codigo IN ('admin','comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN NULL; END IF;

  -- Evita duas propostas iniciais para a mesma solicitação (lock por lead).
  SELECT l.status INTO v_estado FROM gestao.leads l
  WHERE l.id = p_lead_id FOR UPDATE;
  IF v_estado IS NULL OR v_estado NOT IN ('qualificado','orcamento_em_preparo')
    OR EXISTS (SELECT 1 FROM gestao.orcamentos o WHERE o.lead_id=p_lead_id)
  THEN
    RETURN NULL;
  END IF;

  INSERT INTO gestao.orcamentos (lead_id, versao_atual, status)
  VALUES (p_lead_id,1,'rascunho') RETURNING id INTO v_id;
  INSERT INTO gestao.orcamento_versoes
    (orcamento_id,versao,valor_centavos,descricao,validade_em)
  VALUES (
    v_id,1,p_valor_centavos,btrim(p_descricao),
    (p_validade + interval '1 day') AT TIME ZONE 'America/Sao_Paulo'
  );
  IF v_estado = 'qualificado' THEN
    UPDATE gestao.leads SET status='orcamento_em_preparo' WHERE id=p_lead_id;
  END IF;
  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'orcamento',v_id,'criar_rascunho',
    jsonb_build_object('lead_id',p_lead_id,'versao',1,'estado_lead_anterior',v_estado));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date) FROM PUBLIC;

-- A função de leitura retorna somente campos operacionais e exige sessão ativa.
CREATE FUNCTION gestao.listar_orcamentos_restritos(p_token text)
RETURNS TABLE(
  id uuid, lead_id uuid, cliente_nome text, versao integer,
  status text, valor_centavos bigint, descricao text,
  validade_em timestamptz, criado_em timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS(
    SELECT 1
    FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_token,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT o.id,o.lead_id,c.nome,o.versao_atual,o.status,
    v.valor_centavos,v.descricao,v.validade_em,o.criado_em
  FROM gestao.orcamentos o
  JOIN gestao.orcamento_versoes v
    ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.clientes c ON c.id=l.cliente_id
  ORDER BY o.criado_em DESC,o.id DESC
  LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_orcamentos_restritos(text) FROM PUBLIC;

-- Em CI a app é provisionada depois; na produção a role já existe.
DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_orcamentos_restritos(text) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_orcamentos_restritos(text) FROM gestao_convites;
  END IF;
END
$grants$;

INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('011_gestao_orcamento_rascunho.sql','f693e6d06891898e2dbcb38049a2b9005113e1fa9dd7cf3b277203943b6f18ef');

DO $postflight$
BEGIN
  IF NOT has_function_privilege('gestao_app',
      'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE')
    OR NOT has_function_privilege('gestao_app',
      'gestao.listar_orcamentos_restritos(text)','EXECUTE')
    OR has_function_privilege('gestao_convites',
      'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE')
    OR has_function_privilege('gestao_convites',
      'gestao.listar_orcamentos_restritos(text)','EXECUTE')
    OR has_table_privilege('gestao_app','gestao.orcamentos','INSERT')
    OR has_table_privilege('gestao_app','gestao.orcamento_versoes','SELECT')
    OR has_table_privilege('gestao_app','gestao.auditoria','INSERT')
    OR NOT EXISTS(SELECT 1 FROM gestao.schema_migrations
      WHERE versao='011_gestao_orcamento_rascunho.sql'
        AND checksum='f693e6d06891898e2dbcb38049a2b9005113e1fa9dd7cf3b277203943b6f18ef')
  THEN RAISE EXCEPTION 'BLOQUEIO: grants ou checksum incorretos após migration';
  END IF;
END
$postflight$;

COMMIT;
-- Confirmar 11 migrations e grants via SELECT; habilitar flag web SOMENTE depois.
