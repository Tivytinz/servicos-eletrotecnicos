# MEMORIA — Eletrotécnico GO

## Preparação de homologação interativa LOCAL — 06/11/2026 (branch isolada)

- Branch feat/gestao-homologacao-local-20261106: proposta de Docker Compose com PostgreSQL descartável, Next.js HTTPS somente em 127.0.0.1:3443, preparação segura de migrations 001–015, roles restritas e admin fictício. Ambiente não é Railway.
- Scripts e documentação: scripts/homologacao-local.ps1 e docs/gestao-homologacao-local.md. Credenciais geradas apenas no computador do operador, arquivo .env.homologacao-local ignorado pelo Git.
- Produção permanece intocada; **não criar recursos pagos, não criar leads fictícios em produção, não publicar variáveis/admin e não fazer merge sem CI**.
- PENDENTE: validar Docker Desktop Windows e percurso manual; nenhum teste interativo local foi executado a partir do ChatGPT. A versão desta branch não deve ser declarada pronta/implantada antes dessa validação.


## Deploy da configuração 015 em produção — 06/11/2026

- O responsável configurou no Railway a variável `GESTAO_ACEITE_CLIENTE_HABILITADO` e autorizou expressamente a publicação com "pronto, só fazer deploy".
- Consultado o Railway antes do commit: um único patch de variável nesse serviço (não destrutivo), nenhum volume/PostgreSQL/outro recurso alterado. `accept-deploy` confirmou `committed=true`, `deploymentStatus=triggered`; deployment `6688eefe-a6f1-42ef-8065-8932b954aba0` terminou **SUCCESS** em 06/11/2026.
- Verificação depois: web `online`, Postgres `online`, **zero** notificações de warning/critical, sem patch pendente. CI `Check` do commit `e6da9362` [42264823654](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42264823654) **SUCCESS**.
- Banco continua **015 aplicada, 15/15 SHA-256 íntegros**, conforme [42263941244](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42263941244). Nenhuma migration/financeiro/OS executável foi alterada neste deploy.
- Conector Railway expõe apenas **nome da variável**, não seu valor: confirma a configuração publicada, mas não permite atestar o literal `true`. Teste público da rota `/proposta/aceite` a partir desta sessão não pôde ser feito; **não confundir deploy SUCCESS com QA de navegador pós-deploy**. Orientar verificação visual da página sem token real e, depois, testes fictícios supervisionados.
- O link por si só não verifica identidade e não substitui assinatura eletrônica autenticada; dados reais devem observar privacidade/LGPD. Continua sem backup contratado.



## Migration 015 APLICADA em produção; aceite por link ainda desativado — 06/11/2026

- **Autorização inequívoca** nesta conversa: o responsável aprovou aplicar a migration 015 em produção **sem backup**. Risco residual de perda sem restauração recuperável assumido; não contratar recursos adicionais automaticamente.
- Executor da release 015 integrado na [PR #73](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/73) (commit `1796050c`); CI `Check` da PR [42263323263](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42263323263) e da `main` [42263715834](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42263715834) **SUCCESS**.
- **Preflight real SOMENTE LEITURA:** [run 42263807883](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42263807883), `SUCCESS`; `railway/postgres`, 14 migrations com SHA-256 íntegro, 004/013/014 `INTEGRA`, 015 `PENDENTE`; roles `gestao_app` e `gestao_convites` sem privilégios globais elevados; objetos/funções da 015 ausentes.
- **Aplicação real:** [run 42263941244](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42263941244), `SUCCESS`, `COMMIT`, e **15/15 migrations íntegras**, incluindo 015 `INTEGRA`, no PostgreSQL produção. Funções da 015 presentes; a role `gestao_app` possui `EXECUTE` para responder e `gestao_convites` não; sem acesso direto de escrita a orçamentos, OS ou financeiro.
- **Pós-operação Railway:** serviços Web e Postgres `online` com zero alertas; `GESTAO_ACEITE_CLIENTE_HABILITADO` verificada **ausente**. Aplicar a SQL não habilita a interface; requer autorização separada para flag, revisão dos termos de privacidade e QA exclusivamente fictício. Não comunicar com clientes reais nem criar OS executável automaticamente.
- Não houve qualquer comando de limpeza de dados, pagamento ou mudança de RBAC além da criação de funções SQL restritas da 015. A 014 continua sendo apenas OS pendente.



## Operação SQL 015 autorizada, executor restrito em preparação — 06/11/2026

- O responsável autorizou explicitamente a aplicação da migration **015 em produção sem backup** nesta conversa, após indicação de que o SQL estava 14/14 e o código da 015 integrado. Sem cópia recuperável, permanece o risco de perda irreversível.
- Branch `ops/gestao-migrations-015-chat-20261106`: adicionar preflight SQL **somente leitura** da 015, comando do proprietário autenticado no PR #64 com frase literal e release manual, sem expor credenciais, sem acionar por merge/deploy.
- Preflight antes de escrita: validar 004/013/014, contagem 14, checksums de TODAS migrations existentes, papéis restritos e inexistência prévia de objetos 015. Pacote atômico 015 da PR #71 tem transação SQL, bloqueio, `ON_ERROR_STOP=1`, pós-verificação 15/15 e grants.
- **Ainda não aplicado ao redigir este checkpoint**; registrar a URL do run de verificação, execução e evidências reais após CI. A flag `GESTAO_ACEITE_CLIENTE_HABILITADO` permanece ausente, sem autorização neste momento para ativá-la.



## 015 integrada em código, SQL/flag pendentes — 06/11/2026

- Evidência de produção conferida: migration 014 aplicada com **14/14** e `COMMIT` no [run 42253223512](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42253223512); flag `GESTAO_OS_PREPARACAO_HABILITADA=true` ativada com deploy Railway `SUCCESS`. Screenshot do responsável confirma página de OS, **zero candidatas/ordens**, e Cliente Teste não elegível, pois marcado `TESTE INTERNO`.
- Branch `feat/gestao-aceite-link-cliente-015-20261106`: link secreto de 256 bits, SHA-256 apenas no banco, expiração 24h ou validade, reemissão/revogação, visualização e clique explícito do detentor, status/auditoria, OS ainda **somente pendente**; nenhuma mensagem/financeiro. Flag nova `GESTAO_ACEITE_CLIENTE_HABILITADO` ausente por padrão. Browser privado sem GA/analytics.
- **O link demonstra posse do segredo, NÃO verifica identidade ou titularidade do contato e não é assinatura digital autenticada.** Nunca permitir OS executável só com esse registro. Plano em `docs/gestao-aceite-cliente-015.md`.
- PR [#71](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/71) integrada à `main` no commit `bce6cd42d791e4168cbcf46db52e85b822c8dcaf`. `Check` [42260251731](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42260251731), QA HTTPS [42260251668](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42260251668) e regressão de consentimento [42260251721](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42260251721) **SUCCESS**, testes de PostgreSQL descartável (incluindo pacote 015) e navegador. Smoke WhatsApp do HEAD seguia em execução na última conferência; não afirmar aprovação sem resultado.
- **Produção:** código integrado, **SQL permanece 14/14** até autorização específica para aplicar a 015; flag `GESTAO_ACEITE_CLIENTE_HABILITADO` verificada **ausente** no Railway. Deploy de código do merge em espera pelo CI na última conferência, sem escrita SQL. Sem autorização para enviar link real ou habilitar a 015.
- Sem backup contratado conforme decisão de custo; risco de perda irreversível conhecido. O executor de chat em produção só contempla 012/013/014, deve ser ampliado com aprovação separada quando houver implantação futura.


## Executor 014 pronto e diagnóstico real aprovado, SQL ainda pendente — 06/11/2026

- Branch `ops/gestao-migrations-014-chat-20261106`: adicionar 014 ao canal de comando autorizado no PR administrativo #64 e ao workflow manual. Execução protegida com frase literal, preflight SQL somente leitura próprio, checagem de SHA-256 e exigência de 13 migrations antes de criar a 014. Testes de parâmetros, autoria e replay em mock; manter segredos exclusivamente no GitHub Environment.
- A [PR #69](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/69) foi integrada à `main` no commit `3748edf458f7f6aee1cbca1ebf9ec30c54d1d560`; `Check` do HEAD da PR **SUCCESS** [42250803526](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42250803526). Novo comando `/gestao verificar 014` acionado diretamente pelo chat: [run 42251233757](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42251233757) **SUCCESS**, SQL 004/013 `INTEGRA`, 014 `PENDENTE`, catálogo **13 migrations com SHA-256 válido**, sem escrita.
- **Nenhuma migration 014 de produção foi aplicada ou autorizada por `próximo`.** Estado conhecido: SQL 13/13, implantação do código da OS via PR #67 com flag `GESTAO_OS_PREPARACAO_HABILITADA` ausente, banco/site online.
- Sem backup por custo (decisão do responsável) e risco residual de perda irreversível. Solicitar confirmação inequívoca para aplicar 014 após CI/merge; ativação da flag da OS exige operação separada.



## OS 014 integrada em código (ainda sem SQL/flag na produção) — 06/11/2026

- **QA real de orçamentos 011–013:** o responsável confirmou em captura Cliente Teste v2 R$ 475,00, envio e aprovação **declarados como TESTE INTERNO**; histórico com os dois eventos, status `aprovado`. Não houve cliente real, OS ou pagamento. Migration 013 aplicada, produção 13/13; ambas flags de revisão/eventos ativadas, deploy Railway `SUCCESS` e serviços online.
- Próximo incremento: **preparação de OS sem execução**, release `014_gestao_os_preparacao.sql`, aproveitando `gestao.ordens_servico` da 001. Funções com SECURITY DEFINER e RBAC admin/técnico, status apenas `pendente`, eventos/auditoria, barreira explícita para `TESTE INTERNO` e duplicidade. Página `/gestao/ordens-servico` sob flag `GESTAO_OS_PREPARACAO_HABILITADA` **ausente/desativada por padrão**.
- **Aceite relatado não equivale a aceite autenticado**: a OS desta release jamais chega a `aberta`/execução. Confirmação direta do cliente, agendamento, custos e recebimentos ficam em incrementos futuros.
- PR [#67](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/67) integrada à `main` no commit `527084604c61f4b0a2b0e7104bd37874d7539dbf`. `Check` [42245151003](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42245151003) e QA HTTPS [42245151189](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42245151189) concluídos com SUCCESS. Pacote manual atômico da 014, testes PostgreSQL e docs em `docs/gestao-os-014.md`. **Ainda sem autorização para aplicar 014 em produção, habilitar flag ou criar OS de cliente real.**
- O workflow do chat atual permite aplicar somente 012/013; ampliar para 014 requer código, revisão e testes específicos. Decisão de não contratar backup por custo permanece; risco de perda irrecuperável conhecido.



## Migrações SQL 012/013 concluídas, acionamento pelo chat validado — 06/11/2026

- Controle de comandos via GitHub Actions `issue_comment` no PR fechado #64, integrado à `main` pela PR #65, foi validado em **execução real**. O comando `/gestao verificar` executou o run **42234483857** com `SUCCESS`, leitura de banco `railway`: **12/13** íntegras, 013 pendente, nenhuma escrita.
- Após autorização específica do responsável na conversa para aplicar a **013 sem backup**, comando restrito `/gestao aplicar 013 APLICAR_013_PRODUCAO_SEM_BACKUP` disparou o run **42234604088**, que concluiu `SUCCESS`, `COMMIT` e pós-verificação de **13/13 migrations com checksums íntegros**. Logs mostram `012 INTEGRA` e `013 INTEGRA`.
- **Produção: banco 13/13 confirmado.** A execução não habilitou `GESTAO_ORCAMENTOS_REVISAO_HABILITADA` nem `GESTAO_ORCAMENTOS_EVENTOS_HABILITADOS`; continuam sem confirmação de ativação. Próxima operação é verificar grants/estado atual e **solicitar autorização específica antes de ativar flags** e realizar QA com dados fictícios.
- Sem contratação de backup, por decisão de custo do responsável; risco de perda irreversível conhecido. Não afirmar que o suporte a novas migrations é genérico: o acionamento atual só aceita `verificar` e `aplicar` versões 012/013, com confirmações exatas; novas versões exigem atualizar/validar o workflow.
- Consultas e aplicação foram iniciadas diretamente pela integração GitHub do ChatGPT, sem PowerShell do operador nem credenciais divulgadas.



## GitHub Actions acionável pelo chat — 06/11/2026, branch isolada

- Responsável pediu para tornar possível iniciar migrations diretamente pela integração ChatGPT. Conector GitHub disponível não expõe `workflow_dispatch`, mas permite comentar como `Tivytinz` (ID 263981923); teste de identidade não executou SQL.
- Branch `ops/gestao-migrations-comando-chat-20261106`: novo workflow `issue_comment` com filtro de autor, repositório, PR #64 fechado e comando exato; reutiliza o executor de produção via `workflow_call`, `gestao-db-production`, verificações de hash e confirmações. Sem credenciais adicionais.
- **Até haver CI aprovado, merge e teste real `/gestao verificar`, o canal não pode ser anunciado como funcional**. Ver `docs/gestao-migrations-chat-command.md`.
- Produção confirmada no workflow manual #2: migration 012 aplicada, 12/13, SHA íntegro; 013 ainda pendente. Responsável autorizou 013 sem backup, mas esta branch **não executa** migrations, ativa flags ou contrata serviços. Testar primeiro a via read-only.



## Execução manual de migrations via GitHub Actions — 06/11/2026

- Responsável solicitou reutilizar o mecanismo de execução de migrations em nuvem análogo ao Agenda Fashion, evitando PowerShell recorrente.
- **Evidência nova de produção via PowerShell/Railway SSH:** banco `railway` em `postgres`, **11 migrations**; checksums 004/011 íntegros; roles `gestao_app` e `gestao_convites` restritas; tabelas/funções 012/013 ausentes. Apenas leitura, sem novas migrations executadas.
- PR #64 (https://github.com/Tivytinz/servicos-eletrotecnicos/pull/64) criada em branch isolada; CI inicial `Check` 42163989499 `SUCCESS` (lint, testes, migrations em banco descartável, build). Ainda sem merge/execução real; validar CI do HEAD após ajustes finais.
- Branch `ops/gestao-migrations-manual-ci-20261106`: implementação do workflow `workflow_dispatch` com `gestao-db-production`, checagem de hashes de todo catálogo, pacote atômico único 012/013, logs de metadata, proteção anti-reaplicação, SSH privado e teste offline. Documentado em `docs/gestao-migrations-github-manual.md`. CI/PR/merge ainda precisam de validação nesta branch.
- **Ainda não configurado nem usado na produção**: requer ambiente GitHub protegido e três secrets exclusivamente administrativos (token de workspace Railway, chave SSH separada e host key fixada). Conector ChatGPT Railway não disponibiliza SQL/SSH; sem essas credenciais o job falha fechado.
- Decisão de não contratar backup de produção por custo permanece, com risco residual real. Autorização anterior do responsável para migration 012 não se estende automaticamente à 013, a flags ou à criação de credenciais administrativas; cada execução continua manual e auditável.
- Migrations 012 e 013 devem ser aplicadas apenas em sequência, após verificação. Não adicionar credenciais SQL administrativas ao serviço web nem porta TCP pública.



## Operação 012/013 — diagnóstico por Railway SSH, 06/11/2026

- Railway `upbeat-compassion` / `production` confirma serviço web e PostgreSQL online; sem TCP Proxy público; código 012 e 013 na `main`; flags 012/013 ausentes.
- Preparado diagnóstico **read-only** `db/operacoes/gestao-preflight-012-013-somente-leitura.sql` e instruções Windows/PowerShell via `railway ssh --service Postgres` em `docs/gestao-operacao-ssh-migrations-012-013.md`. Teste isolado `tests/gestao-preflight-ssh-db.test.mjs`.
- **Status real das migrations em produção ainda não lido**: conector Railway não executa SQL. Operador poderá rodar inventário pelo SSH local sem expor TCP ou credenciais aqui.
- **Decisão reafirmada:** sem backup de produção neste momento por custo, risco de perda irreversível aceito. Nenhuma migração/flag de produção autorizada nesta etapa; 012 antes de 013 somente depois do preflight e autorização de execução.


## Decisão operacional reafirmada — 06/11/2026

- **Não contratar nem configurar backup de produção por enquanto, por motivos de custos.** Decisão expressa do responsável, que reafirma o plano anterior. Não transformar recomendação de backup em exigência de compra ou serviço adicional.
- O PostgreSQL possui volume persistente, **não** backup recuperável; risco residual de perda permanente de dados é conhecido e aceito para a decisão de adiar backups. Essa escolha **não equivale à autorização para migrar a produção**.
- Permanecem obrigatórios: CI e QA isolados, checksums/histórico 001–011, revisão dos scripts atômicos 012/013, grants/RBAC, validação prévia de estado e **autorização específica antes de qualquer SQL, flag ou deploy operacional de banco**.
- QA HTTPS da revisão e dos eventos de orçamento em preparação na branch `test/gestao-orcamentos-qa-preflight-2026-11-06`; até confirmar CI da branch, não afirmar teste E2E concluído.


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
