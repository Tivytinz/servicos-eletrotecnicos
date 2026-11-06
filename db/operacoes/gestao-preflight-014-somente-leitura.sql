-- Eletrotécnico GO — preflight 014, EXCLUSIVAMENTE SOMENTE LEITURA.
-- É seguro consultar antes (013 vigente) e depois (014 aplicada).
-- Não executa migrations, não acessa dados pessoais e não habilita flags.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';

SELECT current_database() AS banco,
       current_user AS papel_sql,
       pg_is_in_recovery() AS somente_replica,
       (SELECT pg_get_userbyid(nspowner) FROM pg_catalog.pg_namespace
          WHERE nspname='gestao') AS proprietario_schema;

SELECT count(*)::integer AS migrations_aplicadas FROM gestao.schema_migrations;

WITH catalogo(versao,checksum_esperado) AS (
  VALUES
    ('004_gestao_usuario_login.sql','fbf851c1265f500bf38ff3a04ce296563c089c24beadae30320d3d5a3bcc5799'),
    ('013_gestao_eventos_orcamento.sql','ad80c236a30c7d86a192c6531ea9747e058a7e299f042905298d609d4c621ecb'),
    ('014_gestao_os_preparacao.sql','664a1b70888140f61f2f2a0f815fd5f3859c2bbb1e61f6eaf27adce12c1ef402')
)
SELECT c.versao,
       CASE WHEN m.versao IS NULL THEN 'PENDENTE'
            WHEN m.checksum = c.checksum_esperado THEN 'INTEGRA'
            ELSE 'DIVERGENTE - PARE' END AS verificacao
FROM catalogo c
LEFT JOIN gestao.schema_migrations m ON m.versao=c.versao
ORDER BY c.versao;

SELECT rolname,
       NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls) AS privilegios_globais_restritos
FROM pg_catalog.pg_roles
WHERE rolname IN ('gestao_app','gestao_convites')
ORDER BY rolname;

SELECT to_regclass('gestao.ordens_servico') IS NOT NULL AS tabela_os_existente,
       to_regclass('gestao.os_eventos') IS NOT NULL AS tabela_eventos_os_existente,
       to_regclass('gestao.orcamento_eventos') IS NOT NULL AS tabela_eventos_orcamento_existente,
       to_regprocedure('gestao.criar_os_preparacao(text,uuid,integer)') IS NOT NULL AS funcao_014_criar,
       to_regprocedure('gestao.listar_candidatas_os_preparacao_restritas(text)') IS NOT NULL AS funcao_014_candidatas,
       to_regprocedure('gestao.listar_os_preparacao_restritas(text)') IS NOT NULL AS funcao_014_listar,
       COALESCE(has_function_privilege('gestao_app',
         to_regprocedure('gestao.criar_os_preparacao(text,uuid,integer)'),'EXECUTE'),false) AS app_pode_criar,
       COALESCE(has_function_privilege('gestao_convites',
         to_regprocedure('gestao.criar_os_preparacao(text,uuid,integer)'),'EXECUTE'),false) AS convites_podem_criar,
       has_table_privilege('gestao_app','gestao.ordens_servico','INSERT') AS app_pode_inserir_os_direto,
       has_table_privilege('gestao_app','gestao.ordens_servico','UPDATE') AS app_pode_atualizar_os_direto,
       has_table_privilege('gestao_app','gestao.recebimentos','INSERT') AS app_pode_receber_direto;

ROLLBACK;
-- Inspecione INTEGRA e privilégios; um PENDENTE antes da aplicação é esperado.
