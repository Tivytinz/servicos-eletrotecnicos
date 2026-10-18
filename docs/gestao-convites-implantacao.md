# Plano de implantação controlada — gestão de convites e sessões

**ESTADO: NÃO AUTORIZADO PARA PRODUÇÃO.** PR #46 permanece em rascunho. Nenhuma alteração deste plano foi executada no Railway. O banco de produção não tem backup/restauração testados.

## Escopo da migração
- `005_gestao_convites.sql`: tabela de convites, token só em hash e índice de pendentes.
- `006_gestao_convites_funcoes.sql`: emissão/revogação (SECURITY DEFINER).
- `007_gestao_listar_convites.sql`: consulta administrativa sem token.
- `008_gestao_sessoes_protegidas.sql`: pgcrypto, verificador privado de senha (bcrypt sobre SHA-256), limites internos de login, emissão/consulta/revogação de sessões via funções protegidas, e **invalidação deliberada de sessões legadas**.
- `009_gestao_aceite_verificado.sql`: aceite atômico já cadastrando os dois verificadores (scrypt legado e bcrypt privado); substitui a versão de três argumentos.

**Compatibilidade:** após o corte para o novo código, contas existentes (`victor`, `admin`) que não tiverem `gestao.verificadores_senha` **não conseguirão efetuar login**. É obrigatório planejar o registro privado dos verificadores antes de reativar o painel.

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
4. A role `gestao_app` já existe: **não** recriá-la. Aplicar `db/grants/gestao-app.sql` como proprietário do schema. Isso retira `SELECT/INSERT/UPDATE/DELETE` de `gestao.sessoes` e concede exclusivamente EXECUTE nas funções de login/consulta/logout e aceite de convite.
5. Criar a role distinta `gestao_convites` pelo processo controlado `scripts/gestao-provision-convites-role.mjs`, com senha forte privada e confirmação; essa role executa apenas emissão/listagem/revogação. Se a role já existir, revisar os grants em `db/grants/gestao-convites.sql` em vez de recriá-la.
6. Cadastrar verificadores SQL para contas legadas indispensáveis (`victor` e `admin`) através de `scripts/gestao-registrar-verificador.mjs --apply` em terminal operacional seguro, somente **depois de validar a senha atual scrypt** e sem transferir a senha para a conversa. Contas sem verificador são deliberadamente bloqueadas.
7. Conferir grants, ausência de escrita/leitura de sessões pela role comum, negação de leitura da tabela de verificadores, validade das funções, revogação de sessões anteriores e ausência de privilégios financeiros.
8. Após revisão, disponibilizar código aprovado, registrar `DATABASE_URL_CONVITES` (role dedicada), `GESTAO_ORIGEM_PUBLICA=https://eletrotecnicogo.com.br`, e conferir o uso da `DATABASE_URL` restrita. **Nunca** definir `DATABASE_URL_ADMIN` no serviço web.
9. Só então, mediante aprovação explícita independente, habilitar `/gestao` e convites; testar primeiro login próprio, logout, login de Victor, confirmação de senha para convite e revogação. Confirmar status do deploy.
10. Emitir convite real de Carlos somente após validação do processo completo. Preservar `admin` genérico temporariamente até decisão de desativá-lo.

## Consultas SQL de verificação (somente leitura; depois das migrations/roles)
```sql
SELECT versao FROM gestao.schema_migrations ORDER BY versao;
SELECT
  has_table_privilege('gestao_app','gestao.sessoes','SELECT') AS app_le_sessoes,
  has_table_privilege('gestao_app','gestao.sessoes','INSERT') AS app_insere_sessoes,
  has_table_privilege('gestao_app','gestao.verificadores_senha','SELECT') AS app_le_verificador,
  has_function_privilege('gestao_app','gestao.emitir_sessao_segura(text,text,text)','EXECUTE') AS app_login,
  has_function_privilege('gestao_app','gestao.buscar_sessao_segura(text)','EXECUTE') AS app_consulta,
  has_function_privilege('gestao_app','gestao.revogar_sessao_segura(text)','EXECUTE') AS app_logout,
  has_function_privilege('gestao_app','gestao.aceitar_convite(text,text,text,text)','EXECUTE') AS app_aceita,
  has_function_privilege('gestao_convites','gestao.emitir_convite(text,text,text,text)','EXECUTE') AS convites_emite,
  has_table_privilege('gestao_convites','gestao.sessoes','INSERT') AS convites_insere_sessoes;
```
Esperado: `app_le_sessoes`, `app_insere_sessoes`, `app_le_verificador`, `convites_insere_sessoes` **false**; os demais acima **true**.

## Contingência
- Em falha de validação ou configuração: manter flags desativadas, não tentar bypass de permissões, corrigir e reexecutar em homologação.
- Em incidente após habilitação: desabilitar a função de convites/painel e revogar sessões/tokens conforme análise. Retornar a uma versão anterior de código **não restaura os privilégios, hashes ou sessões antigos**. O rollback de banco requer planejamento separado.
- Risco residual: comprometimento do runtime web ainda permite captura de cookies/senhas dos usuários ativos. Proteção mais forte requer isolamento de autenticação/MFA ou serviço independente.
- Referência técnica: [gestao-sessoes-autenticadas.md](gestao-sessoes-autenticadas.md) e [gestao-convites-risco-sessoes.md](gestao-convites-risco-sessoes.md).
