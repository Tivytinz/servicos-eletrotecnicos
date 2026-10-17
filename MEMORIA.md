# MEMORIA — Eletrotécnico GO

**Checkpoint:** 17/10/2026. Fonte persistente de continuidade para agentes. Verificar a `main`, PRs e Railway antes de assumir que este registro permanece atual.

## Convites de acesso — 17/10/2026

- **PR #46 aberta como rascunho**, branch `feat/gestao-convites-fundacao-2026-10-17`. O recurso está desenvolvido mas **ainda não implantado**: migrations `005`–`007` não aplicadas em produção e `GESTAO_CONVITES_HABILITADOS` não habilitada. Ver [docs/gestao-convites.md](docs/gestao-convites.md).
- Fluxo pronto na branch: administrador autenticado emite um link individual (token aleatório 32 bytes, fragmento da URL, validade 24h), destinatário define senha com confirmação, PostgreSQL registra usuário e perfil em operação atômica, impede reutilização e audita os eventos.
- Gestão administrativa: listagem de até 100 convites (sem token/hash), estados `pendente`, `utilizado`, `revogado`, `expirado` e revogação de convite pendente. Reenvio exige revogar o anterior e criar outro link; não há recuperação de segredo.
- Segurança: Server Actions exigem HTTPS/Origin e sessão; funções `SECURITY DEFINER` verificam RBAC no banco; role `gestao_app` só recebe EXECUTE nessas funções, jamais INSERT/UPDATE direto em identidades. Testes de PostgreSQL descartável abrangem grants, concorrência, expiração e RBAC.
- **CI principal e QA Playwright HTTPS aprovados** no commit `9af141a` (runs Check `39055453949` e QA `39055453939`): login admin, emissão, criação de senha, aceite único, login do convidado e revogação. Testes usam banco efêmero e contas fictícias, sem modificar Railway.
- Situação dos sócios: `victor` foi informado como provisionado manualmente pelo responsável e `carlos` **ainda não foi convidado**. Conta genérica `admin` permanece ativa temporariamente.
- Revisão pré-implantação da PR #46: passou a exigir `GESTAO_ORIGEM_PUBLICA` com origem HTTPS fixa no servidor, introduziu índice único para um convite pendente por login, revogação automática de links vencidos ao reemitir e testes extras de técnico sem permissão/token ausente. Runbook operacional em [docs/gestao-convites-implantacao.md](docs/gestao-convites-implantacao.md); **CI do novo commit precisa ser verificado novamente**.
- **Bloqueadores antes de produção:** revisão final de segurança e ambiente operacional, migrações/grants controlados, plano de rollback/recuperação, conferência da main, decisão explícita do responsável para habilitar `/gestao` e convites, e verificação de login pessoal. Não fazer merge ou aplicar migrations apenas por CI verde.

- **BLOQUEADOR DE SEGURANÇA NA PR #46:** `gestao_app` possui INSERT/UPDATE em `gestao.sessoes` e pode fabricar sessão admin; `gestao.emitir_convite` confia nesses registros. CI verde não comprova isolamento contra credenciais SQL vazadas. Veja [docs/gestao-convites-risco-sessoes.md](docs/gestao-convites-risco-sessoes.md). **Não fazer merge, deploy, migrations nem grants de convites até corrigir e testar.**

## Projeto e arquitetura

- Repositório: `Tivytinz/servicos-eletrotecnicos`.
- Site público: `https://eletrotecnicogo.com.br`, landing page de serviços elétricos.
- Stack: Next.js 16, React 19, TypeScript, Tailwind CSS, PostgreSQL (`pg`), Railway.
- Gestão interna: `/gestao`, autenticação por usuário/senha, sessões no PostgreSQL, RBAC e cadastro/listagem de leads.
- Visão de produto, fluxo operacional e regras financeiras: [docs/modelo-gestao-servicos.md](docs/modelo-gestao-servicos.md). O modelo completo de OS/financeiro **não** está implementado.

## Estado operacional conhecido

- Railway: projeto `upbeat-compassion`, ambiente `production`; web e PostgreSQL com volume persistente.
- Migrations `001`–`004` aplicadas manualmente em produção. Usuário administrador inicial provisionado e login validado.
- A aplicação web usa role restrita `gestao_app`; não disponibilizar conexão administrativa ao serviço web.
- Painel **mantido desativado por decisão do responsável** (`GESTAO_HABILITADA=false` informado na operação). Valores de variáveis podem estar ocultos no conector: confirmar no Railway antes de qualquer afirmação ou mudança.
- Houve testes manuais de login, logout, redirecionamento e cadastro de lead fictício em produção. Existe pendência de remoção controlada do registro `Cliente Teste`.
- Backup pago foi adiado por decisão do responsável. Não há restauração testada; persistência não substitui backup.

## Marcos de desenvolvimento confirmados

| PR | Entrega | Estado conhecido |
| --- | --- | --- |
| #37 | Redirecionamento, acesso negado, consentimento no painel, testes RBAC | Integrada |
| #38 | Interface de criação de lead restrita ao papel autorizado e documentação | Integrada |
| #39 | Testes de segurança de sessão e limite por identificador | Integrada; deploy próprio ignorado pelo Railway (SKIPPED), conteúdo incorporado nos commits seguintes |
| #40 | Limite global provisório de 300 tentativas/15 min, além de 5 por identificador | Integrada, deploy SUCCESS |
| #41 | Testes de revogação/expiração/inativação de sessão e Origin/Host | Integrada, deploy SUCCESS no commit `b5ab3b1` |
| #42 | Auditoria RBAC documentada, com pendências de testes HTTP/Server Actions | CI aprovado, mas branch incompatível após atualização da main; substituída por PR nova, conferir encerramento |\n| #43 | AGENTS.md, MEMORIA.md e atualização do README | Integrada na main, CI aprovado; deploy documental SKIPPED |

A última implantação **confirmada nesta conversa** para o web service foi a PR #41 (`b5ab3b1`, Railway SUCCESS). Consultar Railway novamente para estado atual.

## Segurança já implementada

- Token de sessão aleatório armazenado apenas como hash SHA-256; cookie `__Host-eg_sessao` `Secure`, `HttpOnly`, `SameSite=Strict`, expiração em 8 horas.
- Senhas com scrypt e salt; sessões expiradas/revogadas e usuários inativos são rejeitados.
- Login limitado por identificador (5/15 min) e globalmente (300/15 min), usando PostgreSQL; risco de bloqueio coletivo por esgotamento do limite global.
- Papéis `admin`, `comercial`, `tecnico`; checagens de permissão no servidor para leitura e criação de leads.
- Verificação de Origin/Host no login, SQL parametrizado e testes automatizados.
- As permissões para OS e financeiro existem na matriz, **não** implicam módulos concluídos.

## Pendências prioritárias

1. Integrar a auditoria RBAC em nova PR compatível com a main; consultar [docs/gestao-auditoria-rbac-2026-10-17.md](docs/gestao-auditoria-rbac-2026-10-17.md) após merge.
2. Testes de integração HTTP/Server Actions com sessões de diferentes papéis, verificando negação e ausência de gravação; não executar no banco de produção.
3. Revisão de CSRF, LGPD/retensão/exportação/exclusão de dados e isolamento de analytics no painel interno.
4. Conferir grants mínimos e checksum da migration `004` antes de qualquer nova migration.
5. Remover com cautela o lead fictício, revisar monitoramento, paginação e plano de recuperação de dados.
6. Revisar documentação que ainda descreva o módulo de gestão como inteiramente não implementado.

## Rotina de continuidade

Ler [AGENTS.md](AGENTS.md), este checkpoint, os documentos relevantes e os arquivos de código/teste. Registrar novas decisões com evidências, sem sobrescrever riscos não resolvidos. Após cada PR/merge/deploy, atualizar a situação acima na próxima mudança documental. Não habilitar o painel nem contratar serviços sem autorização explícita.
