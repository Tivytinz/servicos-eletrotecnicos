# Gestão — disparar migrations diretamente pelo chat (canal GitHub controlado)

## Objetivo e limite

O conector GitHub utilizado pelo assistente consegue publicar comentários nas PRs como o titular `Tivytinz`, mas **não expõe a operação GitHub Actions `workflow_dispatch`**. Para que o responsável possa pedir uma migration nesta conversa e o assistente **inicie efetivamente o job**, esta release cria um gatilho `issue_comment` estritamente autorizado. Nenhuma nova credencial, porta ou serviço público é criado.

O canal usa **somente comentários novos** no PR administrativo já integrado **#64**, escritos pelo usuário GitHub numérico `263981923` (`Tivytinz`), do repositório `Tivytinz/servicos-eletrotecnicos`. O workflow está fixado à versão da `main`, nunca ao código ou comentários de um PR não confiável. Mensagens editadas, textos diferentes e comentários em outros tópicos não recebem os segredos.

- Workflow do canal: `.github/workflows/gestao-migrations-chat-command.yml`
- Executor original reutilizado: `.github/workflows/gestao-migrations-production-manual.yml` (acrescentado `workflow_call`, preservado `workflow_dispatch`)
- Script de segurança e migrações: `scripts/gestao-migration-railway-manual.sh`, sem mudanças neste incremento.
- Ações reais permanecem em `gestao-db-production`, com secrets do Railway, SHA-256 de todas as migrations existentes, pacotes SQL atômicos, confirmação por release e bloqueio de duplicidade.

## Comandos aceitos (texto exato)

São comentários **no PR #64**. A integração GitHub publica o comentário, que inicia o job correspondente se o titular e o contexto estiverem corretos.

| Comentário exato | Ação |
| --- | --- |
| `/gestao verificar` | Diagnóstico **somente leitura**, sem migration, sem flags |
| `/gestao aplicar 012 APLICAR_012_PRODUCAO_SEM_BACKUP` | Aplica somente 012 se catálogo atual = 11, após autorização específica |
| `/gestao aplicar 013 APLICAR_013_PRODUCAO_SEM_BACKUP` | Aplica somente 013 se catálogo atual = 12, após autorização específica |

**O comentário não equivale à autorização do usuário no chat.** O assistente deve receber autorização clara **antes** de publicar qualquer comando `aplicar`. O usuário pode continuar usando a interface manual do GitHub normalmente. O log da PR e do job fornece trilha de quem pediu cada execução.

## Segurança e riscos

- O segredo de produção somente entra no executor reutilizável após filtro de repositório, PR, estado fechado, autor numérico e texto exato do comentário. O código não interpola texto livre em shell ou SQL.
- Nenhum evento `push`, PR aberto, cron, comentário editado ou conta de terceiros executa SQL. O canal rejeita qualquer release diferente de 012/013.
- Os workflow runs são serializados por `gestao-migrations-production`; confirmações SQL têm pré e pós-validação e migration fora de ordem é recusada.
- Chaves SSH do workspace Railway e o token têm acesso amplo a recursos do workspace. Continuar protegendo o ambiente `gestao-db-production` com branch `main`, revisores quando disponíveis e secrets de ambiente, sem expor credenciais no repositório.
- A confirmação `SEM_BACKUP` registra a decisão vigente de não contratar backup de produção por custos. O risco de perda irreversível permanece.
- Reexecuções manuais de um job podem acontecer; como os pacotes não são reaplicáveis, sempre conferir o estado SQL. Um sucesso no workflow pode refletir **somente leitura**; jamais inferir migration aplicada pela cor verde sem inspecionar o log.

## Verificação de implantação

1. CI da PR do canal deve passar antes de merge.
2. Após integrar à `main`, o assistente publica **`/gestao verificar`** no PR #64. Confirmar que o evento `issue_comment` realmente iniciou o workflow, que o job protegido foi executado, que os checksums passaram e que a contagem corresponde à última confirmação de produção.
3. **Não usar um comando `aplicar` como teste de infraestrutura.** A execução de 013 depende de autorização específica já fornecida pelo responsável na conversa e de confirmação contemporânea do estado 12/13.
4. Se GitHub não iniciar o workflow por comentário da integração, não afirmar disponibilidade; manter o caminho manual como alternativa e diagnosticar o bloqueio.

## Estado anterior conhecido

A execução manual #2 do workflow do GitHub registrou **12 migrations, 012 íntegra, 013 pendente**, sem ativar flags. Esta documentação e seu CI não comprovam que o estado ainda está igual: verificar antes de aplicar a 013.

## Confirmação operacional — 06/11/2026

**Canal efetivamente funcional, sem necessidade de intervenção manual em GitHub Actions:** o conector GitHub publicou `/gestao verificar` no PR #64 e iniciou o run [42234483857](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42234483857), concluído com `SUCCESS` e **12/13** migrations íntegras, sem escrita.

Com autorização específica para 013 sem backup, publicou `/gestao aplicar 013 APLICAR_013_PRODUCAO_SEM_BACKUP`; o run [42234604088](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42234604088) concluiu com `COMMIT`, `SUCCESS` e **13/13 checksums íntegros**. Não houve ativação de flags.

**Limites atuais:** apenas os comandos exatos documentados acima; suportar a próxima migration exigirá incremento revisado de workflow, testes e aprovação da operação. Não inferir existência de backup. O controle atual de flag permanece separado das migrations.
