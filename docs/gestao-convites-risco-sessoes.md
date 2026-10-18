# Auditoria de limite de confiança — sessões e convites

**Data:** 17/10/2026. **Estado:** vulnerabilidade original identificada e corrigida na branch, ainda sem implantação. PR permanece em revisão de segurança/operacional.

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

## Mitigação implementada na branch (a validar)

- A `gestao_app` não recebe mais EXECUTE para `emitir_convite`, `listar_convites` ou `revogar_convite` e continua somente com `aceitar_convite`. O arquivo `db/grants/gestao-app.sql` agora revoga explicitamente privilégios administrativos anteriores.
- Nova role `gestao_convites`, sem privilégios de escrita em `gestao.sessoes` ou tabelas de usuários, recebe exclusivamente EXECUTE das três operações administrativas. Provisionamento isolado: `scripts/gestao-provision-convites-role.mjs`; grants para role existente: `db/grants/gestao-convites.sql`.
- O backend usa `DATABASE_URL_CONVITES` em pool separado; o pool recusa usar a URL comum e recusa uma role SQL diferente de `gestao_convites`. A ausência dessa conexão bloqueia as operações.
- Emissão e revogação exigem nova digitação da senha pessoal, verificada no servidor via scrypt, além de sessão, RBAC e limite de tentativas.
- O teste adversarial grava uma sessão administrativa forjada com credenciais `gestao_app` e exige `42501` nas funções de emissão e listagem; verifica também que `gestao_convites` não escreve sessões nem executa a função pública de aceite.
- Testes funcionais HTTPS usam duas credenciais SQL fictícias **somente em banco descartável**.

### Limites e risco residual

Esta mitigação **isola o vazamento exclusivo de credenciais da role SQL comum**, mas **não equivale a proteção contra comprometimento do processo web**: o mesmo runtime que tem acesso às duas URLs pode ter seus segredos roubados em conjunto. Nesse cenário, o atacante pode usar a role comum para forjar sessões e a role dedicada para invocar funções; a reautenticação na Server Action também pode ser contornada via SQL direto. Para uma fronteira de autenticação mais forte, ainda é necessário proteger emissão de sessões na camada SQL e/ou isolar as operações administrativas em serviço e segredo independentes com autenticação forte verificável pelo servidor protegido.

**Consequência:** manter o bloqueio da PR e não implantar até revisar explicitamente o risco residual, o isolamento operacional e os testes no último commit. Esta etapa reduz o alcance de vazamento de uma única credencial, mas não encerra a auditoria de sessões.

## Correção complementar — migrations 008 e 009 (não implantadas)

Após a primeira mitigação com duas roles, foi implementada uma fronteira de autenticação no PostgreSQL:

1. A role `gestao_app` deixa de poder **ler ou escrever** a tabela `gestao.sessoes`; a role `gestao_convites` permanece sem qualquer permissão de sessão.
2. A emissão de sessão exige a **senha real** validada por bcrypt privado no banco, através de `gestao.emitir_sessao_segura`, com limites de tentativas controlados em tabela não legível pela aplicação.
3. A consulta de identidade usa o token secreto completo (`gestao.buscar_sessao_segura`) e **não revela** `token_hash`; o logout também exige token original.
4. A migration 008 revoga sessões emitidas antes da nova fronteira de segurança. O aceite de convite (migration 009) grava verificador scrypt e bcrypt na mesma operação.
5. Senhas de contas existentes precisam ser verificadas e seus verificadores SQL registrados **em terminal operacional isolado** antes do corte; não é possível converter um hash scrypt para bcrypt sem conhecer a senha.
6. Testes negativos simulam tentativas de INSERT/SELECT/UPDATE pela role comum, leitura de verificador, login errado e reaproveitamento de hashes como bearer token. O QA HTTPS executa login real e convite com contas apenas de teste.

**Risco mitigado nesta branch:** credenciais SQL de `gestao_app` e `gestao_convites`, mesmo juntas, não bastam para fabricar uma sessão de administrador sem senha/token genuíno.

**Risco residual:** comprometimento do próprio runtime web pode capturar senhas e cookies legítimos, além das conexões SQL. Resolver isso exige medidas de isolamento operacional e autenticação adicional; a PR não declara proteção contra execução maliciosa dentro do servidor.

Ver [docs/gestao-sessoes-autenticadas.md](gestao-sessoes-autenticadas.md) e [docs/gestao-convites-implantacao.md](gestao-convites-implantacao.md). **Não realizar merge nem migrations no Railway somente porque o CI está verde.**
