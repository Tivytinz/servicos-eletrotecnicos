# Release 016 — confirmação de posse de canal independente (PROJETO)

**Status em 06/11/2026:** incrementos 016-A e 016-B desenvolvidos **somente na PR #77, em rascunho**. Existe uma migration 016 na branch, **NÃO aplicada em produção**. A política no PostgreSQL nasce `obrigatorio=false`; não há interface pública de desafio nem fluxo de vinculação comprovada do canal. A release 015 continua operando na produção.

## Decisão de produto e segurança

A fase 016 deverá introduzir um desafio temporário entregue **por canal secundário independente e previamente vinculado** ao cliente. O objetivo é elevar a confiança de posse de um canal, **não identificar civilmente a pessoa, nem produzir assinatura eletrônica com identidade comprovada**.

O cadastro atual `gestao.clientes.telefone` é um dado fornecido no atendimento, **não um telefone previamente verificado**. Enviar um segundo código para esse campo, sem processo de vinculação, não comprova identidade. Tampouco adianta enviar link e código na mesma mensagem ou no mesmo fluxo comprometido.

Sem contratar provedor nem enviar mensagens automaticamente: a primeira implementação poderá usar **entrega manual por operador autorizado**, após estabelecer e documentar canal independente. Isso será identificado como **verificação assistida de posse de canal**, nunca como verificação civil. Alternativas futuras para maior garantia: autenticação com provedor confiável, assinatura eletrônica com prova de identidade, integração de autenticação de canal devidamente registrada.

Referência de engenharia: [NIST SP 800-63B — Out-of-Band Authenticators](https://pages.nist.gov/800-63-4/sp800-63b.html). A NIST exige separação de canais, prazo máximo de 10 minutos e uso único. **O projeto não declara conformidade NIST**: os requisitos de vinculação/autenticador e entrega ainda não foram implementados.

## Requisitos mínimos antes de ativar

1. **Vinculação de canal:** diferenciar `contato_informado` de `canal_vinculado`; confirmar a titularidade/controle do dispositivo em procedimento separado, registrar operador, método, data e evidência mínima (sem números completos em logs). Mudança de contato revoga a vinculação e desafios pendentes.
2. **Emissão conjunta:** link 015 e desafio 016 emitidos atomicamente para a versão atual de orçamento ainda `enviado`, com destino vinculado, autorização `admin/comercial` e política que impeça emissão por 015 sem desafio quando a exigência 016 estiver ativa. Reemissão revoga link e desafio anteriores.
3. **Entrega independente:** link e desafio por canais realmente separados. Jamais mostrar ambos no mesmo contexto público; o operador vê o desafio **uma única vez** e declara o canal/ação de entrega. Sem envio automático e sem contato real na homologação.
4. **Segredo e limites:** gerador `src/lib/gestao/desafio-canal-016.ts` usa 96 bits aleatórios em 16 caracteres base64url, persiste só SHA-256, janela máxima de 10 minutos, até **5 tentativas cumulativas por versão de orçamento**, mesmo após reemissão do desafio; reemissão não pode resetar o contador acumulado contra abuso. Tempo, tentativas e revogação devem ser impostos em transação no PostgreSQL, sem confiar no frontend.
5. **Resposta final atômica:** exigir link íntegro, código correto, canal vinculado, declaração de leitura, orçamento/versão/status coerentes e desafio válido. Bloquear repetição, expiração, revogação, corrida e redução de versão. Decisão e auditoria gravadas em uma só transação. O PostgreSQL deve impedir bypass da exigência via função legada 015.
6. **RBAC/menor privilégio:** só `admin/comercial` emitem/revogam, visitante só tenta confirmar; técnico não emite, `gestao_convites` não acessa; `gestao_app` não recebe SELECT/UPDATE direto em tabelas de segredos ou orçamento.
7. **Separação entre evidências:** armazenar apenas flags de `posse_canal_confirmada` e `identidade_verificada=false` com canal/timestamp/versão. Não registrar código, link, token, IP/UA ou número completo em logs. O uso não equivale a assinatura eletrônica autenticada.
8. **OS e financeiro intocados:** a OS só pode nascer `pendente`; não liberar agendamento, execução, cobrança, custos, recebimentos ou alteração de papéis. O aceite assistido NÃO altera automaticamente esse estado.
9. **Migração/ativação:** preparar `016_gestao_desafio_canal.sql`, pacote atômico, preflight, grants e checksum; aplicar somente mediante autorização **específica** após CI, QA com PostgreSQL descartável e estratégia de recuperação. Flag `GESTAO_CONFIRMACAO_CANAL_016_HABILITADA` ausente/desativada por padrão. Nunca assumir que um merge autoriza SQL/flag/contrato de provedor.
10. **Compatibilidade/rollout:** definir explicitamente como tratar links 015 ativos no instante da ativação; por padrão revogá-los/reemitir de forma controlada em vez de permitir salto silencioso do segundo fator. A flag deve ter estado coerente entre banco e aplicação para falhar fechada.

## Divisão de execução

**Incremento 016-A (implementado na PR):** threat model, contrato de segurança e primitivas puras de código/hash/prazo com testes unitários. Não contém página pública nem acesso a SQL de produção.

**Incremento 016-B (esquema e motor SQL preparados na PR):** tabelas de canais, política `OFF`, desafios, limite compartilhado de erros e funções `SECURITY DEFINER` de emissão/resposta atômica; função antiga 015 bloqueada no banco quando o modo 016 estiver ligado. Contato informado não é tratado como canal verificado e alterações de telefone/e-mail revogam vínculos e desafios. A prova externa real de vinculação, segregação de entrega e interface permanecem bloqueadores do incremento 016-C; os canais marcados verificados nos testes são *fixtures sintéticos de um banco descartável*, não clientes reais.

**Incremento 016-C:** formulário do cliente para código em canal independente, auditoria protegida, teste HTTPS real com navegador isolado e testes de ataques/concorrrência.

**Incremento 016-D:** pré-implantação formal (migrations, checksum, grants, recuperação, limites de identidade/LGPD), revisão e **solicitação separada de autorização**, sem ativação automática.

## Controles implementados no SQL da branch 016-B

- `db/migrations/016_gestao_desafio_canal.sql`: nova política `gestao.politica_canal_016` **desativada por padrão**; novos vínculos de canal são registros **não verificados** até comprovação independente (sem endpoint aplicativo para elevá-los).
- `gestao.emitir_desafio_canal_016` vincula o hash do segredo à versão atual, ao link 015 ativo e ao canal previamente verificado; permite apenas sessão admin/comercial e revoga emissão anterior do mesmo link.
- `gestao.responder_link_desafio_016` responde na mesma transação, verifica expiração do link e desafio, status e versão, canal ainda válido, leitura explícita e limite de 5 erros cumulativos por versão. Registra `posse_canal_confirmada=true`, **`identidade_verificada=false`**, e mantém OS apenas pendente.
- Quando a política é ativada no **banco**, a função pública 015 passa a falhar fechada, bloqueando o bypass pela rota antiga. A ativação não ocorre nesta PR.
- A role `gestao_app` tem somente EXECUTE nas funções restritas; `gestao_convites` e tabelas com segredos não recebem acesso. O banco recebe os **hashes SHA-256**, nunca os códigos de canal em texto.
- Qualquer mudança no telefone ou e-mail revoga os canais correspondentes e seus desafios pendentes. **Ainda falta** fluxo real, verificável, de vinculação e entrega de segundo canal.

**Atenção à implantação:** não executar migration 016 no Railway nem atualizar papéis/flags via chat ou CI. Nem mesmo um `Check SUCCESS` substitui a autorização operacional. A PR fica em rascunho até integrar interface, mecanismos de entrega independente, teste de regressão e plano de recuperação.

## Matriz obrigatória de testes

| Cenário | Resultado esperado |
| --- | --- |
| Cliente com telefone informado mas canal NÃO vinculado | Impedir desafio e segunda confirmação |
| Link e código por mesmo canal | Reprovar fluxo como verificação independente |
| Desafio válido, proposta válida e canal vinculado | Registrar posse do canal + manifestação da versão |
| Código errado, tentativa 1–4 | Contagem atômica, mensagem neutra, nenhum aceite |
| 5ª falha | Bloquear desafio; não permitir reset por reemissão |
| Código expirado após 10 minutos | Negar mesmo se o link 015 ainda tiver validade |
| Código ou link revogados/reemitidos | Negar os anteriores |
| 2 confirmações simultâneas | Exatamente 1 decisão e nenhum replay |
| Proposta revisada, recusada ou já aprovada | Negar qualquer aceite fora da versão/estado atual |
| Usuário técnico ou visitante tentando emitir | Negar por RBAC e função SQL |
| Role `gestao_convites` ou `gestao_app` lendo tabela de desafios | Acesso negado |
| Antiga função 015 usada para contornar desafio | Acesso negado pelo PostgreSQL |
| Novo contato cadastrado após emissão | Revogar ou invalidar vinculação/desafio |
| Logs e eventos de marketing | Sem tokens, códigos, dados sensíveis ou analytics na rota |
| OS/financeiro | OS pendente; zero cobranças e escritas financeiras |
| Migração 016 em banco descartável | Hash e grants íntegros, reaplicação bloqueada |
| 015 em produção enquanto 016 desativada | Nenhuma regressão nem nova exigência implícita |

**Bloqueador atual para release executável:** sem um canal anteriormente vinculado, as informações disponíveis não permitem afirmar quem está aprovando. Não avançar para OS executável enquanto identidade/documentação contratual não forem revisadas por método próprio.
