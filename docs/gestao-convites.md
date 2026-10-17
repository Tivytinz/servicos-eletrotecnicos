# Gestão de convites — Eletrotécnico GO

## Objetivo
Victor e Carlos são sócios com acesso `admin`, individual. Carlos criará a própria senha quando for convidado. Futuramente o mesmo mecanismo atenderá colaboradores `comercial` e `tecnico`.

## Fluxo desenvolvido na PR #46 (ainda NÃO liberado)
1. Usuário autenticado com perfil `admin` acessa `/gestao/convites` e escolhe nome de usuário e papel.
2. Server Action verifica HTTPS + Origin/Host, cookie de sessão, RBAC e limite de tentativas.
3. Função `gestao.emitir_convite` verifica a sessão e o papel admin no banco e grava somente SHA-256 de token aleatório de 32 bytes, vínculo ao emissor, papel e expiração de 24 horas. Registra auditoria.
4. Link secreto é exibido **uma única vez** na interface autenticada. Administração copia e compartilha privadamente, sem envio automático de e-mail. O token está no fragmento `#` da URL, não no path/query enviados ao servidor.
5. Em `/gestao/convite`, o convidado informa nome e senha própria (mínimo 12 caracteres, com confirmação). O browser remove o fragmento imediatamente após ler; o token é enviado somente no POST autenticado por Origem, protegido por limite de tentativas.
6. Função `gestao.aceitar_convite` faz `SELECT ... FOR UPDATE` no convite e, em operação atômica, cria usuário, atribui perfil previamente definido e marca consumo. Sessões não são criadas automaticamente. Convidado entra em `/gestao/login`.
7. Função `gestao.revogar_convite` exige sessão admin válida no próprio PostgreSQL; a interface de revogação ainda não foi criada.

## Segurança e menores privilégios
- `gestao_app` NÃO recebe INSERT/UPDATE direto em `gestao.usuarios`, `gestao.usuarios_papeis` nem `gestao.convites`.
- Funções `SECURITY DEFINER` têm `search_path` limitado, SQL estático e `REVOKE EXECUTE FROM PUBLIC`. Apenas `gestao_app` recebe EXECUTE explícito por `db/grants/gestao-app.sql` ou pelo provisionamento inicial da role.
- O token completo nunca é salvo em tabelas, registrado em auditoria, incluído em query string ou em analytics. Rotas `/gestao` não iniciam medição de marketing. Links não devem ser publicados.
- A funcionalidade está fechada por duas condições: `GESTAO_HABILITADA=true` e `GESTAO_CONVITES_HABILITADOS=true`. Não definir essas flags em produção antes da revisão.
- O banco verifica identidade do emissor pelo hash de uma sessão válida, e não por `ator_id` arbitrário vindo do cliente.
- Contas existentes não são alteradas. A conta genérica `admin` permanece temporariamente ativa.

## Validação automatizada
- Testes unitários: entropia/formato do token, hash, nomes de usuário, expiração e revogação.
- PostgreSQL descartável: emissão negada a técnico, convite usado/revogado/expirado, papel exato e concorrência com duas conexões.
- Teste específico `gestao_app`: escrita direta em identidades e convites negada (42501), emissão sem sessão negada, emissão/aceite/revogação via funções autorizadas.
- CI: lint, Node tests, PostgreSQL descartável, type check/build. Consultar resultado **do último commit** antes de habilitar ou realizar merge.

## Procedimento de implantação — NÃO EXECUTAR ATÉ LIBERAÇÃO
1. Conferir PR #46, aprovação da CI atual e teste manual em ambiente isolado. Revisar o plano de recuperação para migrações.
2. Aplicar migrations 005 e 006 com processo de administrador do banco separado da aplicação, sob confirmação explícita. Nunca usar credenciais administrativas no serviço web.
3. Aplicar grants da role `gestao_app` como proprietário do schema, via `db/grants/gestao-app.sql`; não executar a criação de role novamente se ela já existir.
4. Verificar grants e autenticação com o usuário de aplicação sem acesso direto às tabelas de identidade.
5. Revisar limites de taxa, segurança de URLs, CSRF, registro de eventos e experiência móvel em homologação.
6. Habilitar o painel e os convites **somente com autorização específica**, em implantação controlada. Gerar convite de Carlos e validar primeiro login pessoal.

## Pendências
- UI de listagem/revogação/reenvio (revogação já existe no banco).
- Teste E2E HTTP com Server Actions e navegadores, inclusive convite com token ausente, repetição de POST, erro de senha e limpeza de fragmento.
- Revisão de `SECURITY DEFINER` / proprietário das funções e análise de limites/WAF.
- Revisão funcional do caminho de emissão para convites duplicados e convites vencidos.
- Revisão final e **merge apenas após aprovação**. Nem o código da PR nem as migrations estão em produção.
