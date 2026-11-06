# MEMORIA — Eletrotécnico GO

## Eventos de orçamento — checkpoint 06/11/2026 (release 013, branch isolada)

- Release 012: PR #60 merged em `main` `27d4034c`; `Check` concluído com sucesso e Railway web posteriormente confirmou `SUCCESS`. **Isso não comprova que migration 012 foi aplicada** e não habilita a revisão de orçamento.
- Branch `feat/gestao-orcamentos-registro-decisao-013` criada a partir do commit `27d4034c`: desenvolvimento de registro **manual** de envio, aprovação relatada e recusa relatada por versão atual, com RBAC, eventos, auditoria, consulta restrita e bloqueio da mudança manual de status do lead com orçamento. Nenhum envio externo, PDF, OS ou recebimento automático.
- Release 013 precisa de migration 012 antes de qualquer operação SQL. Novo pacote manual `db/operacoes/gestao-orcamentos-013-atomico.sql`, com flag própria `GESTAO_ORCAMENTOS_EVENTOS_HABILITADOS` ausente/desativada por padrão. **Não aplicar migrations nem flags na produção sem autorização operacional separada e plano de recuperação** (backup validado ainda não comprovado).
- Testes SQL em banco descartável e CI/QA devem ser confirmados antes de merge; registrar resultados da PR separadamente. Veja `docs/gestao-orcamentos-013.md`.


## Orçamentos — revisão 012 (05/11/2026, somente branch)

- Primeiro teste manual da release 011: captura do **Cliente Teste** com rascunho versão 1 de **R$ 350,00**, validade 01/01/2027. UI mostra confirmação e entrada na lista; não substituir por prova direta de persistência/autorizações em produção.
- Branch `feat/gestao-orcamentos-revisao-012` iniciada sobre `main` `ce32a0fc`. Nova versão de rascunho com trava e comparação de versão, auditoria, RBAC e flag separada `GESTAO_ORCAMENTOS_REVISAO_HABILITADA`. Código e pacote SQL manual preparados; status de CI, merge, deploy e aplicação SQL precisam de evidência própria.
- **Não habilitar revisão antes de 12/12 migrations + checksum + grants.** Não executar o pacote 012 em produção sem nova autorização; risco de backup/restore ainda aberto. Envio, aceite/rejeição, PDF e OS permanecem fora do escopo.
- Detalhes e checklist: `docs/gestao-orcamentos-012.md`. Próxima etapa planejada: envio/aceite formal de versão específica, sem movimentar pagamentos.


## Primeiro acesso por convite — 05/11/2026

- Responsável informou que **não definiu senhas** das duas contas admin existentes em produção; pretende que cada titular as configure individualmente via link. Não solicitar senha legada nem provisionar contas duplicadas.
- Branch `fix/gestao-primeiro-convite-2026-11-05`: mudanças **somente em desenvolvimento** nas migrations 005/009, emissor privado `scripts/gestao-emitir-convite-inicial.mjs` e testes de primeiro acesso com conta existente. Tokens aleatórios de 24h, vínculo a admin ativo sem bcrypt, proteção contra segundo bootstrap e replay.
- Produção ainda em migrations 001–004; `gestao_convites` e `verificadores_senha` inexistentes. Não houve envio de convite real, SQL de escrita, deploy, alteração de grants, flags ou backup.
- Usuário autorizou prosseguir **sem contratar backup**; isso não elimina o risco de perda irreversível. Requer pré-diagnóstico e operação coordenada, sem publicar links reais nesta conversa.


## Desenvolvimento de gestão — checkpoint 05/11/2026 (sem deploy)

- **PR #46 segue em rascunho**, isolada da `main` e da produção: código de convites, sessões e migrations 005–009 ainda não implantados.
- A PR #51 já entrou somente na branch da PR #46, fechando leitura de hashes pela role `gestao_app`, exigindo `confirmar_senha_admin` protegida, com CI e QA HTTPS aprovados.
- Branch de trabalho `fix/gestao-credencial-unica-reconciliacao-2026-11-05`: migration 009 alterada para receber somente uma senha e derivar bcrypt privado no PostgreSQL; novas contas convidadas têm `senha_hash=NULL` e contas legadas preservam scrypt até migração controlada. Testes e sincronização das páginas públicas com a `main` em validação.
- **Não publicar antes** de revisão de CI/QA do HEAD, reconciliação com a `main`, confirmação de backup **real** e restauração isolada, preflight de checksums/roles, cadastro seguro dos verificadores das contas antigas, janela de manutenção e aprovação separada de migrations/grants/deploy/flags.
- `main` protegida e Railway `Wait for CI=true` (confirmado); o teste negativo da PR #50 comprovou bloqueio de CI e foi encerrado sem merge.
- O histórico detalhado de convites, sessões, flags, QA, RBAC e plano de recuperação fica em `docs/gestao-convites-implantacao.md`, `docs/gestao-sessoes-autenticadas.md` e `docs/gestao-preflight-e-recuperacao.md`.

## Checkpoint de auditoria e correções — 04/11/2026

- Publicação confirmada: `main` commit `5939646`, GitHub Actions `Check` aprovado e Railway web `SUCCESS`; web e PostgreSQL `online` na última verificação operacional.
- Nova preparação **sem merge/deploy** na branch `fix/auditoria-contato-smoke-2026-11-04`: contato centralizado, testes unitários, smoke para todos os CTAs/home/healthcheck e agendamento diário após merge.
- Plano e critérios de aceite: [docs/plano-correcoes-pos-auditoria-2026-11-04.md](docs/plano-correcoes-pos-auditoria-2026-11-04.md).
- Pendências **não executadas**: backup/restauração real, revisão da PR #46 e das migrações de gestão, proteção da `main` (observada desprotegida) e condicionamento de deploy no Railway por CI.
- Não declarar a checagem diária ativa nem os fluxos de `/gestao` protegidos pela PR #46 até integração/validação e autorização específica.


## Atualização de contato — 04/11/2026

- Solicitada a atualização do destino dos CTAs do WhatsApp em todas as páginas públicas para o número empresarial `(62) 99610-5841` (`wa.me/5562996105841`), mantendo as mensagens e a identificação da origem de campanhas.
- Atualizados também os telefones visíveis, dados estruturados e política de privacidade; testes com destino do WhatsApp ajustados para o novo número.
- CI da mudança identificou vulnerabilidade crítica em `next@16.3.8`; `next` e `eslint-config-next` foram atualizados para `16.4.5`, com auditoria de produção, testes e build aprovados no último HEAD da PR #47.
- PR #47 foi integrada e publicada em 04/11/2026. O teste de navegador na branch passou; a execução pós-deploy contra produção ainda necessita de evidência própria.


**Checkpoint:** 17/10/2026. Fonte persistente de continuidade para agentes. Verificar a `main`, PRs e Railway antes de assumir que este registro permanece atual.

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

A última implantação web confirmada na auditoria de 04/11/2026 é a PR #47, commit `5939646`, Railway `SUCCESS`. O registro anterior da PR #41 permanece como histórico.

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
