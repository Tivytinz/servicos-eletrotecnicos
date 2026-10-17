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

O projeto será publicado no Railway e conectado ao domínio:

`eletrotecnicogo.com.br`

## Gestão interna de serviços

O modelo de negócio, fluxo operacional, regras financeiras e intenção de titularidade do módulo de gestão estão documentados em [docs/modelo-gestao-servicos.md](docs/modelo-gestao-servicos.md).

**Situação:** o painel interno inicial em `/gestao` já possui autenticação, RBAC e cadastro/listagem de solicitações, mas permanece **desativado por decisão operacional**. Módulos completos de orçamentos, OS e financeiro ainda não foram entregues. Consulte [docs/gestao-autenticacao-leads.md](docs/gestao-autenticacao-leads.md) para estado e riscos.

## Continuidade para agentes de IA

- [AGENTS.md](AGENTS.md): regras de trabalho, segurança e ordem de leitura.
- [MEMORIA.md](MEMORIA.md): checkpoint operacional, PRs, decisões e pendências.

Agentes devem ler esses arquivos antes de propor ou executar mudanças.
