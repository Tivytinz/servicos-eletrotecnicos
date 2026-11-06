# Eletrotécnico GO — gestão de OS, release 016 (planejamento interno)

**Status:** desenvolvimento em PR isolada; não implantado. A PR #77 (segundo fator por código) foi fechada sem merge. Assim, a sequência oficial da `main` continua em 001–015 e o número **016** é usado para planejamento de OS. Não usar a migration experimental da PR #77.

## O que entrega

- Aproveita a OS **pendente** existente. Admin atribui usuário ativo com papel `tecnico`, uma data **prevista** (sem horário, não confirmada com o cliente) e observação interna opcional de até 500 caracteres.
- Técnico acessa o planejamento em modo leitura. O comercial não acessa OS, de acordo com o RBAC vigente.
- `gestao.os_planejamento_016` mantém dados de planejamento separados dos campos de execução. `ordens_servico.status`, `agendada_para` e `responsavel_id` **não são alterados** pela nova função; não representa serviço agendado nem autorizado.
- `gestao.planejar_os_pendente_016`: valida sessão ativa + admin, técnico ativo, OS ainda pendente, orçamento/versão e lead aprovados, data de hoje até 365 dias à frente (calendário `America/Sao_Paulo`) e versão otimista `revisao` para impedir sobrescrita concorrente. Tudo numa transação PostgreSQL.
- `gestao.listar_os_planejamento_016`: leitura de até 100 OS pendentes por admin/técnico; `gestao.listar_tecnicos_os_016`: nomes/IDs de técnicos ativos somente para admin. Sem acesso SQL direto às tabelas de OS/planejamento para `gestao_app`, e `gestao_convites` sem EXECUTE.
- Cada mudança registra auditoria com técnico, data e revisão, sem registrar observações em log.
- Interface atrás de **nova flag `GESTAO_OS_PLANEJAMENTO_HABILITADO=true`**, desligada por padrão. A interface anterior permanece quando a flag é ausente.

## Limites

Não muda o fluxo de aceite por link privado 015. Aprovação pelo portador do link não atesta identidade civil nem constitui assinatura autenticada.

Este incremento **não agenda** com o cliente, não altera status para `agendada`/`em_execucao`/`concluida`, não produz cobrança, notas, comissão, gastos, pagamento, envio WhatsApp ou ordem executável. Também não valida conflitos de horários porque há apenas uma **data prevista interna**, não horário de compromisso.

## Critérios de teste

- [ ] PostgreSQL **descartável** no CI: 001–016, permissões, sessões, perfil comercial/técnico negado para gravação, admin permitido, técnico inativo negado, nota extensa negada, data passada negada, versão obsoleta e escrita concorrente rejeitadas.
- [ ] Verificar que OS segue `pendente`, `agendada_para` e `responsavel_id` nulos, recebimentos/custos/lancamentos financeiros vazios.
- [ ] Testes, lint, build e QA HTTPS de regressão.
- [ ] Homologação manual no Docker Windows: criar OS fictícia, cadastrar técnico fictício, atribuir data, alterar com F5, confirmar trilha e ausência de status executável.
- [ ] Preparar pacote 016 transacional com hash, preflight e recuperação antes de qualquer autorização de produção.

## Ativação operacional bloqueada

**Não fazer merge automático. Não aplicar a migration 016 em Railway. Não ativar flags ou executar comandos SQL de produção.** Exigir revisão de segurança, CI, homologação, plano de backup restaurável e autorização explícita para cada mudança operacional. Como a PR altera `src/**`, um merge na `main` pode disparar deploy de código pelo watchPattern do Railway.

## Sequência sugerida após esta etapa

017 — confirmação explícita de agendamento, registro de início/fim com responsável e histórico, checagem de pré-condições, controle de sobreposição e cancelamentos. Só posteriormente implantar financeiro operacional.
