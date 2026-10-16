# Fundação técnica da gestão — incremento 1

**Status:** código inicial em revisão, sem implantação. Depende da especificação [modelo-gestao-servicos.md](modelo-gestao-servicos.md).

## Entregue neste incremento

- `db/migrations/001_gestao_base.sql`: esquema PostgreSQL `gestao`, usuários, papéis, clientes, leads, orçamentos versionados, OS, recebimentos, custos, lançamentos, gastos em anúncios, fechamentos e auditoria; constraints e índices básicos.
- `src/lib/gestao/financeiro.ts`: função pura de apuração com centavos inteiros, quilômetros em **milésimos de km** (40 km = 40.000), tarifa de R$ 1,20/km, provisão de 10%, distribuição 20/24/56, sem distribuição positiva em prejuízo.
- `src/lib/gestao/estados.ts`: validação pura das transições de OS.
- `tests/gestao-financeiro.test.mjs`: cenários financeiros, conservação de centavos, entrada inválida e transições proibidas.
- `/gestao`: rota reservada que **responde 404 intencionalmente** até a autenticação e autorização estarem prontas. Nenhuma tela administrativa nem dados são publicados.

## Não entregue — bloqueadores de produção

1. Banco PostgreSQL provisionado e migração aplicada/validada em ambiente de teste.
2. Driver de banco, pool, repositórios de dados e migrations automatizadas.
3. Autenticação persistente, sessão segura, recuperação/revogação de sessão, autorização no servidor por recurso e proteção contra tentativas de login.
4. Criação controlada dos primeiros usuários e definição de grants/roles da aplicação.
5. Interfaces e APIs de leads, orçamentos, OS e financeiro.
6. Livro-razão transacional/idempotente e política para custos de recebimentos parciais, estornos e conciliação.
7. Auditoria de segurança, testes de integração com PostgreSQL e backups/restauração.

**Não habilitar `/gestao` com um login improvisado ou uma senha fixa em variável de ambiente.** Não executar SQL em produção até revisão de segurança, plano de rollback e configuração de credenciais de banco.

## Execução local e validação

- `npm run check`: lint, testes Node e build do site.
- A migração exige **PostgreSQL 15+** e deve ser aplicada inicialmente **apenas em banco de desenvolvimento/homologação** por operador autorizado, após revisão:
  `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_gestao_base.sql`
- `DATABASE_URL` é segredo e não deve entrar no repositório ou em logs.
- Não há dependência de PostgreSQL em runtime ainda; a migration é um contrato inicial, não um banco ativo.
- A rota pública de WhatsApp e as landings devem continuar com seus testes de regressão.

## Próximo incremento

Provisionar PostgreSQL isolado e autenticação robusta com sessão persistente, definir permissões de Victor/Carlos, criar testes de integração e só então habilitar a primeira tela interna de leads.
