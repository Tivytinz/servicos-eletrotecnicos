-- Executar como proprietário do schema, após criar papel LOGIN de aplicação
-- com senha segura em gerenciador de segredos. Usar psql -v app_role=gestao_app.
-- NUNCA executar migrations com o usuário da aplicação.
\set ON_ERROR_STOP on
BEGIN;
REVOKE ALL ON SCHEMA gestao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
GRANT USAGE ON SCHEMA gestao TO :"app_role";
GRANT SELECT ON gestao.usuarios, gestao.usuarios_papeis TO :"app_role";
REVOKE INSERT, UPDATE, DELETE ON gestao.sessoes FROM :"app_role";
REVOKE SELECT, INSERT, UPDATE, DELETE ON gestao.sessoes FROM :"app_role";
GRANT EXECUTE ON FUNCTION gestao.emitir_sessao_segura(text,text,text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.buscar_sessao_segura(text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.revogar_sessao_segura(text) TO :"app_role";
GRANT SELECT, INSERT ON gestao.clientes, gestao.leads TO :"app_role";
GRANT SELECT, INSERT, UPDATE ON gestao.tentativas_login TO :"app_role";
-- A role comum só aceita links válidos, nunca administra convites.
REVOKE EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) FROM :"app_role";
REVOKE EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) FROM :"app_role";
REVOKE EXECUTE ON FUNCTION gestao.listar_convites(text) FROM :"app_role";
GRANT EXECUTE ON FUNCTION gestao.aceitar_convite(text,text,text,text) TO :"app_role";
COMMIT;
