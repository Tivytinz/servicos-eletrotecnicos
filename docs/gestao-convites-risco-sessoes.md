# Auditoria de limite de confiança — sessões e convites

**Data:** 17/10/2026. **Conclusão: BLOQUEADOR para implantação do fluxo de convites em produção.**

## Evidência de código
- `db/grants/gestao-app.sql` e `scripts/gestao-provision-role.mjs` atribuem a `gestao_app` leitura de `gestao.usuarios` e `gestao.usuarios_papeis`, além de `SELECT, INSERT, UPDATE` em `gestao.sessoes`.
- A função `gestao.emitir_convite` definida na migration 006 autoriza emissão quando encontra uma sessão ativa de `admin` em `gestao.sessoes` pelo `token_hash` informado.
- Com as permissões acima, **a posse das credenciais SQL da role `gestao_app` é suficiente para fabricar registros de sessão e chamar diretamente a função de emissão**. A função não consegue distinguir uma sessão efetivamente emitida após login legítimo de uma escrita diretamente por essa mesma role SQL.
- Os testes atuais demonstram que a role não pode inserir diretamente em `gestao.usuarios` ou `gestao.usuarios_papeis`, mas **isso não equivale** a impedir a elevação indireta por sessão.
- Esta limitação também afeta a garantia de autenticidade de sessões do painel existente, não apenas convites.

## Impacto
- Se a credencial SQL de aplicação for comprometida, a separação de escrita de identidades não impede necessariamente que sejam criados novos administradores através da cadeia de funções.
- **Não considerar o mecanismo pronto para produção, apesar do CI e do E2E verdes.** Os testes exercitam o fluxo funcional, não a resistência a esse caminho alternativo de autenticação.
- Não executar migrations 005–007 nem conceder EXECUTE a `gestao_app` antes de resolver o modelo de confiança.

## Correção recomendada (proposta para implementação e teste)
1. **Separar privilégios de gestão de identidades:** role SQL específica e isolada para emissão/revogação, sem conceder esses EXECUTEs à `gestao_app`; operações comuns da aplicação permanecem na role já restrita.
2. **Autenticação reforçada para operações administrativas sensíveis:** requerer verificação recente da senha própria ou autenticação adicional antes de invocar a role de convites, evitando que uma sessão arbitrariamente fabricada a partir da role comum dispare convites.
3. **Corrigir autenticação de sessões na camada SQL:** impedir inserção/alteração arbitrária de `usuario_id` e `token_hash` pela role comum. Considerar função de autenticação com prova criptográfica validável por segredo não legível à role ou serviço de autenticação isolado. Preservar compatibilidade de logins existentes ou planejar migração segura.
4. **Adicionar testes de ataque no PostgreSQL descartável e E2E:** verificar que credenciais SQL comuns isoladamente não permitem personificar admin, emitir convite administrativo ou atribuir perfil admin; testar fluxo legítimo com login e reautenticação.
5. Revisar titulares de privilégios `SECURITY DEFINER`, ausência de grants implícitos, logs de auditoria e transações.
6. Só então revalidar CI/QA, revisar implantação com responsável e planejar grants sem privilégios excessivos.

## Operação atual
- PR #46 deve permanecer em **rascunho**, sem merge; flags `GESTAO_HABILITADA` e `GESTAO_CONVITES_HABILITADOS` sem alteração.
- Nenhuma das migrations de convites foi aplicada no PostgreSQL de produção nesta auditoria. A role `gestao_app` de produção existe para funcionalidade já anterior.
- O usuário recusou custo de backup nesta fase; nenhuma operação de produção sem decisão operacional específica.

**O objetivo da auditoria é detectar uma lacuna real do desenho atual; não basta confiar somente em RBAC de aplicação ou em funções `SECURITY DEFINER` quando a mesma role pode construir os atributos usados como prova de autorização.**
