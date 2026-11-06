# Gestão — 014: Ordem de Serviço em preparação, NÃO executável

## Por que esta etapa existe

O teste em produção de 06/11/2026 confirmou o fluxo de orçamento do **Cliente Teste**, versão 2, R$ 475,00, com **envio e aprovação simulados explicitamente como TESTE INTERNO**. Isso valida o registro de decisão relatada pela equipe, **não** comprova que um cliente real aceitou a proposta.

O modelo exige uma OS só após aprovação. Esta etapa 014 permite **planejamento interno não executável** para orçamentos com aprovação relatada (exceto os marcados como teste interno), mas **não** permite execução, agendamento, faturamento, custos ou recebimentos. A confirmação direta/independente do cliente será um incremento separado, antes de abrir OS executável.

## Entregas da 014

- Reaproveita `gestao.ordens_servico` e `gestao.os_eventos` criadas na migration 001: não cria tabela duplicada e não altera dados anteriores.
- `gestao.criar_os_preparacao(token,orcamento,versao)`: aceita apenas orçamento aprovado, lead aprovado e evento de aprovação na versão atual. Sessão ativa com perfil **admin ou técnico**, trava o orçamento e lead em transação e bloqueia uma segunda OS do mesmo orçamento.
- A nova OS recebe somente status **`pendente`**, responsável e agenda vazios, evento com motivo e trilha de auditoria contendo `aceite_verificado=false`. Não há função/action 014 para mudar status ou lançar despesas.
- **Exclui propostas com aprovação explicitamente prefixada por `TESTE INTERNO`** na consulta e na função de criação. Isso impede a OS do Cliente Teste; a detecção textual **não é mecanismo de comprovação de aceite** e não substitui futura confirmação direta.
- `listar_candidatas_os_preparacao_restritas` e `listar_os_preparacao_restritas`: consultam somente até 100 itens para sessão admin/técnico, sem permissões SQL diretas no armazenamento.
- Página `/gestao/ordens-servico` e link no painel, sob `GESTAO_OS_PREPARACAO_HABILITADA=true`, desativada por padrão.
- Corrigido texto desatualizado no vazio de rascunhos, indicando que a revisão já está disponível.

## Regras negativas

- **Comercial não pode criar/consultar OS** nesta etapa; admin e técnico podem visualizar a preparação e criar ficha pendente (permissão `os:gerir`).
- O servidor valida flag, sessão, permissão, origem autorizada, UUID e versão; o PostgreSQL repete autenticação, RBAC e estado da proposta.
- `gestao_app` recebe apenas `EXECUTE` nas três funções de 014, não `INSERT/UPDATE` de OS, eventos ou financeiro; `gestao_convites` é explicitamente bloqueada.
- Sem comprovação independente do aceite, nenhum estado `aberta`, `agendada` ou `em_execucao` é atingível pelo novo módulo.
- Não gera PDF, ordem executável, contato com cliente, cobranças, pagamentos, alterações da comissão ou marcação de serviço concluído.
- Evitar usar registro de aprovação declarado pelo operador como prova contratual.

## Desenvolvimento e testes

- `tests/gestao-os-preparacao-db.test.mjs`: sessão, perfis, versão obsoleta, rascunho, simulação, duplicidade, auditoria, ausência de financeiro e grants no banco descartável.
- `tests/gestao-os-preparacao-release-db.test.mjs`: pacote integral 014 em banco descartável, SHA-256, privilégios mínimos e reaplicação bloqueada.
- `tests/gestao-convites-browser.mjs`: navegador HTTPS em PostgreSQL **descartável**, cobrindo a criação da OS pendente, a proibição de duplicidade e a ausência de controles de execução/financeiro. A flag 014 é ligada **somente no CI**, não em produção.
- `npm run check` e GitHub Actions `Check` são obrigatórios, mais validação de deploy/flag em etapa operacional separada.

## Implantação — não fazer automaticamente

**Estado conhecido de produção antes desta PR:** SQL 013 aplicado e confirmado 13/13; serviço web/Postgres online; flags de revisão/envio liberadas e fluxo de testes fictícios concluído. **Não há autorização para aplicar 014 nesta conversa.**

1. Integrar somente com CI verde. A flag `GESTAO_OS_PREPARACAO_HABILITADA` permanece **ausente**.
2. Após autorização específica, aplicar `db/operacoes/gestao-os-014-atomico.sql` inteiro, sob `postgres` no banco `railway`, após revisar preflight, hash 004/013, permissões e plano de contenção. O pacote confirma 14/14 e bloqueia reaplicação.
3. A expansão do mecanismo pelo chat para a 014 está em preparação separada, com testes e pré-verificação somente leitura. **Mesmo depois de integrada**, só permite aplicar 014 após autorização específica; nunca usar a mudança de código ou a palavra *próximo* como autorização. Não executar a 014 silenciosamente em deploy ou por executor genérico.
4. Somente depois de SQL validado, CI e deploy saudáveis, habilitar **separadamente** a flag `GESTAO_OS_PREPARACAO_HABILITADA=true` no serviço web; realizar QA em banco descartável e consulta restrita no ambiente real, sem criar ficha no orçamento de teste e sem escrever em clientes reais.
5. Reversão de exposição: retirar a flag da tela e action; não excluir OS/eventos nem tentar reverter migration histórica manualmente.

O responsável decidiu **adiar backup de produção por custo**. Volume persistente não é backup; qualquer migration nova envolve risco de perda irrecuperável apesar da transação SQL. Nova aplicação requer consentimento específico.

## Próxima etapa 015 (não entregue)

Criar confirmação de aprovação feita diretamente pelo cliente com verificação de identidade/posse do canal, prova mínima auditável e revogação/expiração segura. Somente depois disponibilizar transições de OS (aberta, agendada, em execução, concluída), evidências técnicas e custos reais, preservando segregação entre OS e recebimentos.
