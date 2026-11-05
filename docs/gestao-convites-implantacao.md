# Plano de implantação controlada — gestão de convites e sessões

**ESTADO: NÃO AUTORIZADO PARA PRODUÇÃO.** PR #46 permanece em rascunho. Nenhuma alteração deste plano foi executada no Railway. O banco de produção não tem backup/restauração testados.

## Escopo da migração
- `005_gestao_convites.sql`: tabela de convites, token só em hash, índice de pendentes e vínculo opcional ao admin preexistente em bootstrap operacional (sem precisar de sessão já ativa).
- `006_gestao_convites_funcoes.sql`: emissão/revogação (SECURITY DEFINER).
- `007_gestao_listar_convites.sql`: consulta administrativa sem token.
- `008_gestao_sessoes_protegidas.sql`: pgcrypto, verificador privado de senha (bcrypt sobre SHA-256), limites internos de login, emissão/consulta/revogação de sessões via funções protegidas, confirmação de senha administrativa sem expor hash à aplicação e **invalidação deliberada de sessões legadas**.
- `009_gestao_aceite_verificado.sql`: substitui aceite legado por senha única; convite comum cria uma conta nova e bcrypt; convite bootstrap valida vínculo a **admin existente ativo e sem verificador**, preserva identidade/papel e define bcrypt. A coluna `senha_hash` passa a aceitar NULL para contas novas e admins que ativaram acesso via convite.

**Compatibilidade / primeiro acesso:** as contas administrativas existentes sem `gestao.verificadores_senha` não conseguem login ainda. Como o responsável não criou senhas e quer que cada pessoa defina a sua, **não pedir senha antiga** nem criar contas duplicadas. O processo `scripts/gestao-emitir-convite-inicial.mjs --apply` vincula um convite temporário a uma conta admin existente via `usuario_existente_id`, depois o titular acessa `/gestao/convite` e cria sua própria senha. O banco atualiza **a mesma conta**, preserva a role admin, cadastra bcrypt canônico e inutiliza o link. `gestao.usuarios.senha_hash` legado da conta ativada passa a NULL. Este fluxo não autoriza enviar link a pessoa sem confirmação de identidade.

## Inventário somente leitura e recuperação

Procedimento complementar: [gestao-preflight-e-recuperacao.md](gestao-preflight-e-recuperacao.md).

Foi adicionado `scripts/gestao-preflight.mjs --check`, que examina checksums de migrations, privilégios SQL e cobertura agregada de verificadores em transação READ ONLY, sem modificar o banco. Ele é testado somente com PostgreSQL descartável no CI. **A ausência de inconsistências não comprova backup/restore nem autoriza a implantação.** Para recuperação sem assinatura de backup gerenciado, avaliar dump lógico e **restauração testada em banco isolado**, com proteção adequada dos dados e custos de armazenamento/transferência considerados.

## Critérios prévios
- Aprovação explícita do responsável para migrar e modificar credenciais/variáveis no Railway. A autorização de desenvolvimento da PR não é autorização operacional.
- Análise do risco residual de comprometimento do processo web, revisão de `SECURITY DEFINER`/pgcrypto e confirmação de CI + Playwright HTTPS no último commit.
- Estratégia de backup recuperável e restauração, ou decisão operacional específica diante da ausência de backup. Banco persistente não equivale a cópia de segurança.
- Plano de corte coordenado: manter `GESTAO_HABILITADA` e `GESTAO_CONVITES_HABILITADOS` desativadas até as novas roles, verificadores, código e testes estarem prontos. Não interromper o site público.
- Senhas e URLs SQL jamais colocadas em GitHub, screenshots, chats, parâmetros CLI, logs ou no build do Next.js.

## Sequência proposta — apenas com autorização posterior
1. Confirmar no banco somente leitura as migrations 001–004, roles existentes, cobertura de verificadores (quando aplicável) e estado atual dos serviços, preferindo o inventário `scripts/gestao-preflight.mjs --check` em terminal operacional privado. Esse comando não é executado em produção nesta PR. Confirmar também qual commit está realmente rodando no Railway.
2. Preparar mecanismo de recuperação testado, janela de migração e rollback do código. Não alterar a `main` enquanto não houver decisão de merge.
3. Em execução isolada com credenciais administrativas, aplicar migrations **005–009** com `scripts/gestao-migrate.mjs`, confirmação operacional e análise de checksums. A 008 **revoga sessões existentes**.
4. A role `gestao_app` já existe: **não** recriá-la. Aplicar `db/grants/gestao-app.sql` como proprietário do schema. Isso retira `SELECT/INSERT/UPDATE/DELETE` de `gestao.sessoes`, retira `SELECT` de `gestao.usuarios` e `gestao.usuarios_papeis` e concede somente as funções protegidas de login/consulta/logout, confirmação de senha administrativa e aceite de convite.
5. Criar a role distinta `gestao_convites` pelo processo controlado `scripts/gestao-provision-convites-role.mjs`, com senha forte privada e confirmação; essa role executa apenas emissão/listagem/revogação. Se a role já existir, revisar os grants em `db/grants/gestao-convites.sql` em vez de recriá-la.
6. Como não há senha anterior conhecida do responsável, **emitir convites iniciais** via `scripts/gestao-emitir-convite-inicial.mjs --apply`, exclusivamente no terminal operacional privado com `DATABASE_URL_ADMIN`, `GESTAO_BOOTSTRAP_USUARIO`, `GESTAO_ORIGEM_PUBLICA=https://eletrotecnicogo.com.br` e `GESTAO_BOOTSTRAP_CONFIRM=EMITIR_CONVITE_INICIAL`. O operador identifica cada admin ativo (sem divulgar credenciais), confirma a identidade do destinatário, emite um link individual de 24h e o entrega privadamente, sem copiar tokens ao GitHub ou ao chat. A pessoa define sua própria senha via HTTPS, e o banco ativa a conta legada sem duplicá-la. `scripts/gestao-registrar-verificador.mjs` permanece somente como alternativa **para contas cujo titular de fato conhece a senha antiga**; não executá-lo para estas duas contas.
7. Conferir grants, ausência de escrita/leitura de sessões pela role comum, negação de leitura da tabela de verificadores, validade das funções, revogação de sessões anteriores e ausência de privilégios financeiros.
8. Após revisão, disponibilizar código aprovado, registrar `DATABASE_URL_CONVITES` (role dedicada), `GESTAO_ORIGEM_PUBLICA=https://eletrotecnicogo.com.br`, e conferir o uso da `DATABASE_URL` restrita. **Nunca** definir `DATABASE_URL_ADMIN` no serviço web.
9. Após migrações, grants, variáveis e checagens, disponibilizar temporariamente os endpoints `/gestao/convite` e `/gestao/login` conforme flags autorizadas. Emitir o convite inicial privado e validar **primeira ativação e login do titular** antes de emitir convites regulares; depois testar logout, RBAC, convites e revogação. Confirmar status do deploy.
10. Se a segunda conta administrativa já existir, ativá-la por **convite inicial vinculado**, em vez de cadastrar um usuário duplicado. Se ainda não existir, enviar convite comum após o primeiro admin ter acesso. Não assumir o vínculo dos dois registros reais sem inventário em SQL somente leitura.

## Consultas SQL de verificação (somente leitura; depois das migrations/roles)
```sql
SELECT versao FROM gestao.schema_migrations ORDER BY versao;
SELECT
  has_table_privilege('gestao_app','gestao.sessoes','SELECT') AS app_le_sessoes,
  has_table_privilege('gestao_app','gestao.sessoes','INSERT') AS app_insere_sessoes,
  has_table_privilege('gestao_app','gestao.verificadores_senha','SELECT') AS app_le_verificador,
  has_table_privilege('gestao_app','gestao.usuarios','SELECT') AS app_le_usuarios,
  has_table_privilege('gestao_app','gestao.usuarios_papeis','SELECT') AS app_le_papeis,
  has_function_privilege('gestao_app','gestao.emitir_sessao_segura(text,text,text)','EXECUTE') AS app_login,
  has_function_privilege('gestao_app','gestao.buscar_sessao_segura(text)','EXECUTE') AS app_consulta,
  has_function_privilege('gestao_app','gestao.revogar_sessao_segura(text)','EXECUTE') AS app_logout,
  has_function_privilege('gestao_app','gestao.confirmar_senha_admin(text,text)','EXECUTE') AS app_confirma_admin,
  has_function_privilege('gestao_app','gestao.aceitar_convite(text,text,text)','EXECUTE') AS app_aceita,
  has_function_privilege('gestao_convites','gestao.emitir_convite(text,text,text,text)','EXECUTE') AS convites_emite,
  has_table_privilege('gestao_convites','gestao.sessoes','INSERT') AS convites_insere_sessoes;
```
Esperado: `app_le_sessoes`, `app_insere_sessoes`, `app_le_verificador`, `app_le_usuarios`, `app_le_papeis`, `convites_insere_sessoes` **false**; os demais acima **true**.

**Integridade do aceite preparada (não implantada):** a função recebe apenas token, nome e senha. Para usuários convidados, o único verificador é `gestao.verificadores_senha` (bcrypt privado). O campo legado `gestao.usuarios.senha_hash` fica NULL para novos convites. A compatibilidade de contas existentes depende do procedimento de migração dos verificadores; segurança do processo e backup real permanecem bloqueadores.

## Contingência
- Em falha de validação ou configuração: manter flags desativadas, não tentar bypass de permissões, corrigir e reexecutar em homologação.
- Em incidente após habilitação: desabilitar a função de convites/painel e revogar sessões/tokens conforme análise. Retornar a uma versão anterior de código **não restaura os privilégios, hashes ou sessões antigos**. O rollback de banco requer planejamento separado.
- Risco residual: comprometimento do runtime web ainda permite captura de cookies/senhas dos usuários ativos. Proteção mais forte requer isolamento de autenticação/MFA ou serviço independente.
- Referência técnica: [gestao-sessoes-autenticadas.md](gestao-sessoes-autenticadas.md) e [gestao-convites-risco-sessoes.md](gestao-convites-risco-sessoes.md).
