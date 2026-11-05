# Plano de correções pós-auditoria — Eletrotécnico GO

**Data:** 04/11/2026  
**Escopo:** landing page pública, rotinas de QA e controles de publicação.  
**Base verificada:** `main` no commit `5939646`, GitHub Actions Check aprovado, Railway `production` / web `SUCCESS`.  
**Status deste plano:** alterações seguras preparadas em PR separada; nenhum deploy, migração, acesso à base real ou alteração de configuração foi executado por este plano.

## 1. Entregas desta PR (código e testes)

- [x] Número comercial centralizado em `src/lib/contato.ts`, evitando desencontro entre os CTAs, telefone visível, JSON-LD e política de privacidade.
- [x] Testes unitários para construção de URL, número E.164, apresentação e importação da fonte única.
- [x] Smoke Playwright ampliado: home + páginas de serviço, **todos** os CTAs, parâmetros de origem paga/orgânica, preservação de contexto entre páginas e `/api/health`. Não abre o WhatsApp nem envia mensagens.
- [x] Workflow: em PRs, executa contra o Next.js compilado localmente; `workflow_dispatch` verifica a produção; agendamento diário às **11:17 UTC** (08:17 em Goiás, UTC−3) somente **após merge**.
- [ ] Verificar os checks do HEAD da PR e, posteriormente, o resultado da checagem contra o domínio público. A existência do workflow não comprova que a produção foi testada.
- [ ] Considerar alertas/monitoramento externo: cron do GitHub não é monitoramento 24/7, pode atrasar e não garante notificação imediata ao responsável.

## 2. Bloqueadores de segurança da gestão (não executar nesta PR)

A `main` atual ainda dá à role SQL `gestao_app` `SELECT` em `gestao.usuarios` e `SELECT, INSERT, UPDATE` em `gestao.sessoes`. Isso cria risco de fabricação de sessões caso as credenciais de aplicação sejam comprometidas. A **PR #46** prepara um redesenho, mas está em rascunho e contém migrations, grants e alteração de autenticação com risco de indisponibilidade.

**Critérios prévios para PR #46, em atividade separada:**

1. Rever funções `SECURITY DEFINER`, `search_path`, `pgcrypto`, privilégios e testes de ataque no HEAD atualizado da PR #46, sem confundir CI em banco descartável com produção.
2. Confirmar o valor operacional de `GESTAO_HABILITADA` no Railway sem divulgar segredos; manter desativado até autorização explícita.
3. Fazer backup **real** antes das migrations, guardar cópia fora do ambiente operacional, validar integridade e **restaurar em PostgreSQL isolado**. Volume persistente não é backup. Validar política/custo/retenção antes de ativar serviços pagos.
4. Fazer preflight em modo somente leitura no banco real por procedimento seguro. Comparar checksums das migrations aplicadas, começando pela `004`.
5. Preparar verificadores de senha das contas legadas em operação privada. Sem isso a atualização pode impedir login legítimo.
6. Aprovar janela de manutenção, sequência indivisível de migrations `005`–`009`, alteração de grants e código, com plano de rollback e contingência testado.
7. Executar testes reais de RBAC/Server Actions/CSRF em ambiente descartável, cobrindo ausência de escrita sem permissão. Não testar com escrita em dados reais.
8. Só após evidências e autorização específica: avaliar merge, migração, deploy e eventual habilitação de `/gestao`. São **decisões independentes**.

A PR #45 (documentos e testes de sócios/RBAC) está aberta e deve ser reconciliada com a `main` antes de qualquer merge.

## 3. Controle de branch e pipeline de produção (configurações pendentes)

**GitHub:** a `main` foi observada com `protected=false`. Configurar em *Settings → Rules → Rulesets* (ou Branch protection):

- Escopo: branch `main`; exigir PR antes de merge.
- Exigir status check **“Lint, testes, banco e build”** do workflow `Check` no commit mais recente.
- Impedir force-push e exclusão; restringir bypass e considerar pelo menos uma revisão de pessoa distinta quando houver revisor disponível.
- Não desativar controles para contornar falhas; corrigir CI ou registrar exceções formalmente.

**Railway:** origem do web service em `main`; check suites estavam `false` na leitura de configuração. Habilitar o bloqueio de deploy por checks, **se suportado no plano/conexão atual**, e validar com mudança inofensiva em branch de teste. A proteção do GitHub e o bloqueio no Railway são controles complementares, não substitutos.

**Importante:** essas alterações são administrativas. Não foram executadas nesta PR.

## 4. Privacidade e recuperação

- Definir responsável, finalidade, base legal, prazo de retenção, procedimento de exclusão e exportação dos dados pessoais de clientes/leads (LGPD) antes de ampliar o uso de `/gestao`.
- Revisar se a política pública contempla adequadamente o tratamento que ocorre fora da landing (WhatsApp e gestão).
- Documentar periodicidade, armazenamento criptografado, testes de restore e custo de backup real.
- Remoção do registro fictício `Cliente Teste` depende de identificação/backup e autorização operacional; não remover sem confirmação.

## 5. Verificação da publicação após eventual merge

1. Conferir `Check` + smoke da **PR** verdes no último HEAD (não em commits anteriores).
2. Só após aprovação, integrar PR, conferir CI de `main`, deploy Railway `SUCCESS` e SHA implantado.
3. Executar smoke `workflow_dispatch` contra `https://eletrotecnicogo.com.br` após o deploy e registrar URL do run. Verificar resposta 200, `/api/health`, todos os destinos `wa.me/5562996105841` e mensagens por página.
4. Validar visualmente no celular, sem enviar mensagem de teste não autorizada. Monitorar primeiras visitas e conversões reais respeitando consentimento.
5. Atualizar `MEMORIA.md` e este plano com evidências e eventuais pendências; não declarar entrega/ativação apenas com PR criada.

## 6. Ordem de prioridade

1. **Segurança e recuperação da gestão:** PR #46, backup/restore, verificação de acesso real e migração coordenada.
2. **Governança de deploy:** proteção de `main` e condição de checks no Railway.
3. **Captação:** verificação de WhatsApp e monitoramento pós-deploy.
4. **Manutenção:** centralização de contato, atualização da documentação e métricas.

**Limite desta preparação:** esta PR não modifica credenciais, usuários, banco de produção, variáveis, regras do GitHub/Railway ou disponibilidade do site.
