# Serviços Eletrotécnicos

Landing page oficial do **Eletrotécnico GO**.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Railway

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Produção

O projeto público está implantado no Railway e conectado ao domínio:

`https://eletrotecnicogo.com.br`

O contato comercial é definido em `src/lib/contato.ts`. Todas as páginas comerciais devem reutilizar essa fonte, evitando números divergentes.

## Gestão interna de serviços

O modelo de negócio, fluxo operacional, regras financeiras e intenção de titularidade do módulo de gestão estão documentados em [docs/modelo-gestao-servicos.md](docs/modelo-gestao-servicos.md).

**Situação conferida em 06/11/2026:** o painel interno `/gestao` possui autenticação, RBAC, solicitações e orçamentos versionados com registro de envio/decisão. A migration **014** está aplicada em produção (**14/14**) e a tela de **OS somente em preparação** foi ativada e visualizada, sem propostas aptas porque o Cliente Teste teve aprovação simulada. **OS executável e financeiro ainda não foram entregues.** A confirmação direta por link teve o código **015 integrado à `main`, mas a migration/flag ainda não foram implantadas** (ver [docs/gestao-aceite-cliente-015.md](docs/gestao-aceite-cliente-015.md)). Algumas outras seções históricas nos docs registram estados antigos e devem ser lidas com o checkpoint mais recente de [MEMORIA.md](MEMORIA.md).

## Continuidade para agentes de IA

- [AGENTS.md](AGENTS.md): regras de trabalho, segurança e ordem de leitura.
- [MEMORIA.md](MEMORIA.md): checkpoint operacional, PRs, decisões e pendências.

Agentes devem ler esses arquivos antes de propor ou executar mudanças.

## Qualidade e operação

- `npm run check`: lint, testes unitários e compilação.
- `.github/workflows/check.yml`: validação de PR/main com PostgreSQL descartável e auditoria de dependências de produção.
- `.github/workflows/smoke-whatsapp-production.yml`: teste de links/healthcheck em PR local; a versão **proposta nesta PR** também agenda a validação diária do site após merge e permite disparo manual em produção.
- [Plano de correções pós-auditoria](docs/plano-correcoes-pos-auditoria-2026-11-04.md): segurança da gestão, backup, proteção da branch principal e verificação pós-deploy. **Não habilitar o painel interno como efeito desse plano.**
