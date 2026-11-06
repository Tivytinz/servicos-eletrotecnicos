-- Eletrotécnico GO · desativação controlada da conta genérica admin.
-- NÃO EXECUTAR ANTES de Carlos aceitar o convite e Victor/Carlos testarem login.
-- Procedimento MANUAL, separado das migrations; não é executado por CI/deploy.
-- Não apaga a conta, não remove papéis nem viola as FKs históricas.
-- ALTERA DADOS DE PRODUÇÃO. Sem backup por decisão consciente do responsável.
-- O cliente DEVE usar psql -X -v ON_ERROR_STOP=1 -f (arquivo completo).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
DECLARE
  v_victor uuid;
  v_carlos uuid;
  v_generico uuid;
  v_quantidade int;
BEGIN
  IF current_database() <> 'railway' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'BLOQUEIO: operação restrita ao banco railway e role postgres';
  END IF;
  IF NOT pg_try_advisory_xact_lock(20261105, 1) THEN
    RAISE EXCEPTION 'BLOQUEIO: desativação concorrente';
  END IF;
  IF (SELECT COUNT(*) FROM gestao.schema_migrations) <> 9 THEN
    RAISE EXCEPTION 'BLOQUEIO: banco sem as nove migrations esperadas';
  END IF;

  -- Travar contas na mesma ordem para impedir trocas simultâneas.
  PERFORM id FROM gestao.usuarios
    WHERE usuario IN ('victor','carlos','admin') ORDER BY usuario FOR UPDATE;

  SELECT id INTO v_victor FROM gestao.usuarios
    WHERE usuario='victor' AND ativo = true;
  SELECT id INTO v_carlos FROM gestao.usuarios
    WHERE usuario='carlos' AND ativo = true;
  SELECT id INTO v_generico FROM gestao.usuarios
    WHERE usuario='admin' AND ativo = true;

  IF v_victor IS NULL OR v_carlos IS NULL THEN
    RAISE EXCEPTION 'BLOQUEIO: Victor ou Carlos ainda não possui conta ativa';
  END IF;
  IF v_generico IS NULL THEN
    RAISE EXCEPTION 'BLOQUEIO: conta admin genérica ausente ou já desativada';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM gestao.usuarios_papeis p
    WHERE p.usuario_id = v_victor AND p.papel_codigo='admin'
  ) OR NOT EXISTS(
    SELECT 1 FROM gestao.usuarios_papeis p
    WHERE p.usuario_id = v_carlos AND p.papel_codigo='admin'
  ) THEN
    RAISE EXCEPTION 'BLOQUEIO: Victor e Carlos precisam manter o papel admin';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM gestao.verificadores_senha v
      WHERE v.usuario_id = v_victor)
    OR NOT EXISTS(SELECT 1 FROM gestao.verificadores_senha v
      WHERE v.usuario_id = v_carlos) THEN
    RAISE EXCEPTION 'BLOQUEIO: Victor e Carlos precisam ter senhas pessoais ativadas';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM gestao.convites c
    WHERE c.usuario='carlos' AND c.usuario_criado_id=v_carlos
      AND c.usado_em IS NOT NULL AND c.revogado_em IS NULL
      AND c.papel_codigo='admin'
  ) THEN
    RAISE EXCEPTION 'BLOQUEIO: convite individual de Carlos ainda não foi utilizado';
  END IF;
  IF EXISTS(SELECT 1 FROM gestao.verificadores_senha v WHERE v.usuario_id=v_generico) THEN
    RAISE EXCEPTION 'BLOQUEIO: login generico tem verificador pessoal; precisa revisao humana';
  END IF;
  IF EXISTS(SELECT 1 FROM gestao.convites c
      WHERE c.usuario='admin' AND c.usado_em IS NULL
      AND c.revogado_em IS NULL AND c.expira_em > clock_timestamp()) THEN
    RAISE EXCEPTION 'BLOQUEIO: ha convite de admin generico ainda pendente';
  END IF;

  UPDATE gestao.sessoes SET revogada_em = clock_timestamp()
    WHERE usuario_id = v_generico AND revogada_em IS NULL;
  UPDATE gestao.usuarios SET ativo = false
    WHERE id = v_generico AND ativo = true;
  GET DIAGNOSTICS v_quantidade = ROW_COUNT;
  IF v_quantidade <> 1 THEN
    RAISE EXCEPTION 'BLOQUEIO: nao foi possivel desativar exatamente uma conta';
  END IF;

  INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes)
  VALUES (NULL, 'usuario', v_generico, 'desativar_admin_generico',
    jsonb_build_object('operacao', 'DBA manual', 'substituida_por_contas_individuais', true));
END
$guard$;

COMMIT;
-- Conferir com gestao-admin-generico-auditoria.sql: admin conta_ativa=false,
-- Victor e Carlos permanecem conta_ativa=true e perfil_admin=true.
