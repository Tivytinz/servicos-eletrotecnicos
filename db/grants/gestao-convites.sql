-- Aplicar como proprietário do schema após provisionar a role gestao_convites.
-- NUNCA usar credenciais de administrador no processo web.
\set ON_ERROR_STOP on
BEGIN;
GRANT USAGE ON SCHEMA gestao TO gestao_convites;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM gestao_convites;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA gestao FROM gestao_convites;
REVOKE EXECUTE ON FUNCTION gestao.aceitar_convite(text,text,text) FROM gestao_convites;
GRANT EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) TO gestao_convites;
GRANT EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) TO gestao_convites;
GRANT EXECUTE ON FUNCTION gestao.listar_convites(text) TO gestao_convites;
-- A role comum nunca deve operar convites de privilégio elevado.
REVOKE EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) FROM gestao_app;
REVOKE EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) FROM gestao_app;
REVOKE EXECUTE ON FUNCTION gestao.listar_convites(text) FROM gestao_app;
COMMIT;
