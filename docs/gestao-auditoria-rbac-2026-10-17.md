# Auditoria RBAC — Gestão Eletrotécnico GO (17/10/2026)

## Escopo e evidências

Revisão estática da implementação na `main` após a PR #41. Esta auditoria **não** equivale a pentest ou teste HTTP ponta a ponta.

| Entrada | Verificação no servidor | Resultado da revisão |
| --- | --- | --- |
| `/gestao` | `GESTAO_HABILITADA` e `usuarioAtual()` | Exige sessão; redireciona anônimo |
| `/gestao/login` | flag e `usuarioAtual()` | Redireciona usuário já autenticado |
| `/gestao/leads` | flag, sessão e `temPermissao(papeis, "leads:ler")` | Bloqueia leitura não autorizada |
| `cadastrarLead` (Server Action) | flag e `exigirPermissao("leads:criar")` **antes** da inserção SQL | Bloqueia gravação sem permissão |
| `sair` (Server Action) | revoga token da sessão apresentado | Logout de sessão, não ação administrativa |

## Matriz RBAC implementada

| Papel | Clientes ler/criar | Leads ler/criar | Orçamentos gerir | OS gerir | Financeiro ler/gerir |
| --- | --- | --- | --- | --- | --- |
| admin | sim/sim | sim/sim | sim | sim | sim/sim |
| comercial | sim/sim | sim/sim | sim | não | não/não |
| tecnico | sim/não | sim/não | não | sim | não/não |

**Importante:** permissões para orçamentos, OS e financeiro estão definidas no código, mas as ações correspondentes ainda não estão disponíveis no painel. A matriz não prova implementação dos módulos.

## Testes existentes e lacunas

- `tests/gestao-permissoes.test.mjs`: permissões por papel, perfis desconhecidos e união de papéis.
- `tests/gestao-sessoes-integracao.test.mjs`: sessão válida, expirada, revogada e usuário inativo com PostgreSQL descartável.
- `tests/gestao-origem.test.mjs`: validação de Origin/Host no login.
- **Pendente:** teste real de requisição/Server Action com sessão técnica ou anônima tentando cadastrar lead e confirmação de zero gravações; teste com sessão comercial e administrador, confirmação de gravação e rollback.
- **Pendente:** teste HTTP de negação da listagem por perfil e teste de proteção contra CSRF nas Server Actions, com ambiente descartável.
- **Pendente:** revisão de permissões para novas operações quando forem criadas; não presumir segurança apenas pela visibilidade de botões.

## Condições operacionais

- Não habilitar `GESTAO_HABILITADA` apenas porque esta auditoria foi documentada.
- Não executar testes destrutivos no banco de produção. Usar banco descartável, credenciais exclusivas e rollback.
- A documentação principal continua em `docs/gestao-autenticacao-leads.md`.
- O risco de perda de dados sem restauração testada permanece; volume persistente não substitui backup.
- Nenhuma conclusão sobre segurança definitiva deve ser feita antes dos testes HTTP/E2E pendentes.

## Registro da decisão

A implementação atual de `cadastrarLead` já valida `leads:criar` no servidor antes da instrução SQL parametrizada. Nesta etapa, optou-se por **não alterar a Server Action** nem criar um helper desacoplado sem ligação efetiva à rota. A próxima mudança deverá incluir teste de integração que execute a ação real, e não apenas uma função auxiliar ou um teste da matriz de permissões.
