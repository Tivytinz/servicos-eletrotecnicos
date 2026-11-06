-- Executar como proprietário do schema, após criar papel LOGIN de aplicação
-- com senha segura em gerenciador de segredos. Usar psql -v app_role=gestao_app.
-- NUNCA executar migrations com o usuário da aplicação.
\set ON_ERROR_STOP on
BEGIN;
REVOKE ALL ON SCHEMA gestao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
GRANT USAGE ON SCHEMA gestao TO :"app_role";
REVOKE SELECT ON gestao.usuarios, gestao.usuarios_papeis FROM :"app_role";
REVOKE SELECT, INSERT, UPDATE, DELETE ON gestao.sessoes FROM :"app_role";
GRANT EXECUTE ON FUNCTION gestao.emitir_sessao_segura(text,text,text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.buscar_sessao_segura(text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.revogar_sessao_segura(text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.confirmar_senha_admin(text,text) TO :"app_role";
-- Mudança de status permitida apenas via função SECURITY DEFINER com sessão/RBAC.
GRANT EXECUTE ON FUNCTION gestao.alterar_status_lead(text,uuid,text,text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.listar_orcamentos_restritos(text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text) TO :"app_role";
GRANT EXECUTE ON FUNCTION gestao.listar_eventos_orcamento_restritos(text) TO :"app_role";
GRANT SELECT, INSERT ON gestao.clientes, gestao.leads TO :"app_role";
GRANT SELECT, INSERT, UPDATE ON gestao.tentativas_login TO :"app_role";
-- A role comum só aceita links válidos, nunca administra convites.
REVOKE EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) FROM :"app_role";
REVOKE EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) FROM :"app_role";
REVOKE EXECUTE ON FUNCTION gestao.listar_convites(text) FROM :"app_role";
GRANT EXECUTE ON FUNCTION gestao.aceitar_convite(text,text,text) TO :"app_role";
COMMIT;
