-- Eletrotécnico GO — preflight 015: EXCLUSIVAMENTE SOMENTE LEITURA.
-- A consulta é válida antes (14/14) e depois (15/15) da aplicação.
-- Sem alterações em dados, configurações, segredos ou pagamento.
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
  ('014_gestao_os_preparacao.sql','664a1b70888140f61f2f2a0f815fd5f3859c2bbb1e61f6eaf27adce12c1ef402'),
  ('015_gestao_link_aceite_cliente.sql','da49d39bbc38728a1454cdb854a64e693c5042b38729a10f21d57f73589e2b43')
)
SELECT c.versao,
 CASE WHEN m.versao IS NULL THEN 'PENDENTE'
      WHEN m.checksum=c.checksum_esperado THEN 'INTEGRA'
      ELSE 'DIVERGENTE - PARE' END AS verificacao
FROM catalogo c LEFT JOIN gestao.schema_migrations m ON m.versao=c.versao
ORDER BY c.versao;

SELECT rolname,
 NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls) AS privilegios_globais_restritos
FROM pg_catalog.pg_roles
WHERE rolname IN ('gestao_app','gestao_convites')
ORDER BY rolname;

SELECT to_regclass('gestao.links_aceite_cliente') IS NOT NULL AS links_015_presentes,
       to_regprocedure('gestao.emitir_link_aceite_cliente(text,uuid,integer,text)') IS NOT NULL AS funcao_015_emitir,
       to_regprocedure('gestao.revogar_link_aceite_cliente(text,uuid,integer)') IS NOT NULL AS funcao_015_revogar,
       to_regprocedure('gestao.consultar_link_aceite_cliente(text)') IS NOT NULL AS funcao_015_consultar,
       to_regprocedure('gestao.responder_link_aceite_cliente(text,text,boolean)') IS NOT NULL AS funcao_015_responder,
       to_regprocedure('gestao.listar_links_aceite_cliente_restritos(text)') IS NOT NULL AS funcao_015_listar,
       COALESCE(has_function_privilege('gestao_app',to_regprocedure('gestao.responder_link_aceite_cliente(text,text,boolean)'),'EXECUTE'),false) AS app_pode_responder,
       COALESCE(has_function_privilege('gestao_convites',to_regprocedure('gestao.responder_link_aceite_cliente(text,text,boolean)'),'EXECUTE'),false) AS convites_podem_responder,
       has_table_privilege('gestao_app','gestao.orcamentos','UPDATE') AS app_pode_alterar_orcamento_direto,
       has_table_privilege('gestao_app','gestao.ordens_servico','INSERT') AS app_pode_criar_os_direto,
       has_table_privilege('gestao_app','gestao.recebimentos','INSERT') AS app_pode_receber_direto;

ROLLBACK;
-- Antes: 14 migrations, 004/013/014 INTEGRA, 015 PENDENTE e funções ausentes.
-- Depois: 15 migrations, todas INTEGRA, funções presentes e grants restritos.
