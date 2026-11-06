# Gestão — release 015: manifestação direta sobre orçamento por link privado

## Escopo e status

**Código integrado à `main` pela PR #71 (commit `bce6cd42`) com `Check` e QA HTTPS aprovados. Migration 015 e flag NÃO implantadas em produção.** Esta é uma entrega de desenvolvimento, não a liberação do recurso para clientes reais. Construir um fluxo próprio para uma pessoa que recebeu um link privado visualizar e aprovar/recusar a versão exata de uma proposta. O sistema registra **posse do link e clique explícito**, mas **não verifica a identidade civil, titularidade do telefone/WhatsApp/e-mail, nem gera assinatura eletrônica com identidade comprovada**.

A release 014 já foi aplicada em produção (14/14) e a tela de OS foi ativada/observada, sem candidatas. O Cliente Teste foi aprovado apenas com evidência `TESTE INTERNO`; a release 015 não emite link para esse registro e não autoriza OS executável.

## Funcionamento

1. Um operador com papel admin/comercial registra o **envio manual** de proposta, através da 013. Isso não envia automaticamente nada.
2. Com status `enviado`, versão válida e evento de envio não identificado como `TESTE INTERNO`, o operador pode **gerar link de uso único**. O segredo aleatório de 256 bits é exibido **uma única vez**, só em resposta autenticada, e **não** é persistido em claro. O PostgreSQL registra apenas SHA-256, versão, emissor, datas, revogação e decisão.
3. O operador confere o destinatário e transmite manualmente pelo canal escolhido. **Qualquer pessoa com o link pode responder**; o envio não comprova que o destinatário correto o recebeu.
4. A página pública `/proposta/aceite#TOKEN` extrai o token do fragmento, que **não é enviado no GET nem no Referer**. O cliente vê versão, valor, descrição e validade; deve marcar declaração explícita de leitura e escolher **aprovar** ou **não aprovar**.
5. SQL serializa a resposta, impede replay e respostas contraditórias, exige proposta ainda `enviado`, lead `orcamento_enviado`, versão atual, token não revogado/usado e validade da proposta e do link. Registra decisão em tabela própria, status do orçamento/lead e auditoria sem armazenar IP, user-agent ou hash nos logs de auditoria.
6. Link vale até **24 horas ou fim da validade do orçamento**, o que vier primeiro. Reemissão revoga o anterior. Operador também pode revogar manualmente. Pré-visualização do link nunca o consome.
7. O módulo 014 foi ampliado para reconhecer também aprovação por link como **candidata a OS em preparação**. Uma OS criada continua rigorosamente **`pendente`**, sem agendamento, execução, custos, recebimento ou cobrança; auditoria marca `aceite_verificado=false` e `identidade_verificada=false`.

## Controles

- Feature flag separada, inicialmente **ausente**: `GESTAO_ACEITE_CLIENTE_HABILITADO=true` somente após migration 015 aplicada, checksums e grants validados, CI e QA descartável aprovados, consentimento explícito de implantação.
- Server Actions de emissão/revogação revalidam sessão/RBAC, origin/host configurados, formatos e status; PostgreSQL repete regras de autorização e estado com `SECURITY DEFINER SET search_path=pg_catalog,pg_temp`.
- Server Actions públicas exigem **Origin HTTPS exata** configurada, token com formato de 256 bits e os controles transacionais de uso único do PostgreSQL. Nenhuma rota de cliente depende de login interno.
- `gestao_app` tem **EXECUTE nas cinco funções**, sem SELECT/INSERT/UPDATE direto na tabela de tokens nem UPDATE em orçamentos/OS e sem escrita em financeiro. `gestao_convites` não recebe EXECUTE. O campo hash nunca aparece em listagem de pessoal.
- Página `/proposta/aceite` não oferece analytics, consentimento de marketing ou captura do token; noindex/nofollow/noarchive, referrer no-referrer. O fragmento é removido do navegador após resposta registrada. Não incluir token em query string, prints, logs, analytics, tickets ou screenshots.
- O link é um **segredo portador**: pode ser encaminhado, compartilhado ou capturado por malware e não valida o WhatsApp do cliente. Para aceite com verificação mais forte será necessário um canal controlado/OTP independente ou integração com um provedor de assinatura/identidade (escolha futura, sem contratar serviço agora). Em caso de contestação, não usar apenas esse registro como prova conclusiva de identidade.
- Sem anexos, PDF, envio automático, integração de WhatsApp, cobrança, cartões, financeiro, agendamento nem mudança de OS para status executável.

## Testes

- `tests/gestao-aceite-cliente-db.test.mjs`: permissões, emissão/reemissão/revogação, sessão de comercial e técnico, tokens errados/usados/expirados, declaração de leitura, aprovação/recusa, corrida de duas confirmações, isolamento financeiro, auditoria e OS somente pendente, tudo no PostgreSQL **descartável**.
- `tests/gestao-aceite-cliente-release-db.test.mjs`: pacote inteiro 015, SHA-256 real, 15/15, grants e reaplicação bloqueada no PostgreSQL **descartável**.
- `tests/gestao-convites-browser.mjs` com flag 015 apenas em CI: HTTPS real com cliente fictício, visualização, confirmação, ausência de analytics, replay, estado aprovado e OS pendente.
- `npm run check` via GitHub Actions `Check` e QA HTTPS, além de revisão manual dos limites e ameaça de vazamento de token.

## Implantação (separada do desenvolvimento)

**Não executar a migration 015 nem ativar a flag em produção como efeito de merge.** Base atual conhecida: 014 íntegra, banco 14/14 e OS em preparação acessível, sem ordens. O responsável adiou backup por custos, ciente do risco de perda irrecuperável.

1. Revisar a PR, testes, segurança e UX; integrar o código apenas após CI aprovado. A flag permanece ausente. Como a nova rota é protegida por flag, o deploy do código não exige migração automática.
2. Validar 14/14, SHA-256 da 004 e 014, grants e objetos em consulta somente leitura antes da release.
3. Solicitar **autorização específica para 015**, então usar `db/operacoes/gestao-aceite-cliente-015-atomico.sql` (preflight transacional, pacote integral, `COMMIT`, pós-validação 15/15). O executor existente só oferece comando controlado para **012–014**; ampliar de forma isolada e testada antes de aplicar 015. Não executar ferramenta genérica que aplica múltiplas migrations em produção.
4. Após confirmação do banco, **autorização separada** para configurar `GESTAO_ACEITE_CLIENTE_HABILITADO=true` no Railway web e deploy, com verificação de saúde. Fazer QA de URL e proteção usando base descartável; não abrir links para clientes reais sem revisão de termos e privacidade.
5. Reversão de exposição: desligar flag, sem apagar tokens/decisões, não realizar rollback SQL improvisado sem cópia de recuperação.
6. Definir prazo de retenção e política de privacidade das evidências de aceite (LGPD) antes da operação real.

## Próximos incrementos

- Identidade/posse do canal confirmada independentemente por canal verificado e prevenção de redirecionamento; eventualmente assinatura eletrônica forte.
- OS executável apenas após requisitos adicionais de identificação, autorização, aceite contractual e planejamento da obra.
- PDF ou snapshot imutável da proposta se necessário para prova de conteúdo/condições (na 015 conteúdo atual da versão é imutável no fluxo normal, mas a base ainda não é prova documental assinada).
