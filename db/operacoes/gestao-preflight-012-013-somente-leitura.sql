-- Eletrotécnico GO: PRÉ-VERIFICAÇÃO 012/013, SOMENTE LEITURA.
-- NUNCA executa migrations, ativa flags ou realiza escrita.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';

SELECT current_database() AS banco,
       current_user AS papel_sql,
       pg_is_in_recovery() AS somente_replica,
       (SELECT pg_get_userbyid(nspowner)
          FROM pg_catalog.pg_namespace WHERE nspname='gestao') AS proprietario_schema;

SELECT count(*)::integer AS migrations_aplicadas
FROM gestao.schema_migrations;

WITH catalogo(versao, checksum_esperado) AS (
  VALUES
    ('004_gestao_usuario_login.sql','fbf851c1265f500bf38ff3a04ce296563c089c24beadae30320d3d5a3bcc5799'),
    ('011_gestao_orcamento_rascunho.sql','f693e6d06891898e2dbcb38049a2b9005113e1fa9dd7cf3b277203943b6f18ef'),
    ('012_gestao_revisao_orcamentos.sql','c291dbfa239d99e3796d58ed5a041bca9336180f2b82ba6e798a5af36c9c20b6'),
    ('013_gestao_eventos_orcamento.sql','ad80c236a30c7d86a192c6531ea9747e058a7e299f042905298d609d4c621ecb')
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

SELECT to_regclass('gestao.orcamentos') IS NOT NULL AS tabela_orcamentos,
       to_regclass('gestao.orcamento_versoes') IS NOT NULL AS tabela_versoes,
       to_regclass('gestao.orcamento_eventos') IS NOT NULL AS tabela_eventos_013,
       to_regprocedure('gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)') IS NOT NULL AS funcao_012,
       to_regprocedure('gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)') IS NOT NULL AS funcao_013;

ROLLBACK;
-- Se COUNT não for 11, 12 ou 13, ou algum checksum estiver DIVERGENTE, PARAR.
-- Retornar só a saída não sensível, sem URIs de conexão, credenciais ou tokens.
