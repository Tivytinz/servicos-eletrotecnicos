-- Executar como proprietário do schema, após criar papel LOGIN de aplicação
-- com senha segura em gerenciador de segredos. Usar psql -v app_role=gestao_app.
-- NUNCA executar migrations com o usuário da aplicação.
\set ON_ERROR_STOP on
BEGIN;
REVOKE ALL ON SCHEMA gestao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
GRANT USAGE ON SCHEMA gestao TO :"app_role";
GRANT SELECT ON gestao.usuarios, gestao.usuarios_papeis TO :"app_role";
GRANT SELECT, INSERT, UPDATE ON gestao.sessoes TO :"app_role";
GRANT SELECT, INSERT ON gestao.clientes, gestao.leads TO :"app_role";
GRANT SELECT, INSERT, UPDATE ON gestao.tentativas_login TO :"app_role";
COMMIT;
