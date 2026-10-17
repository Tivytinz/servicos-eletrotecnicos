# Gestão de convites — Eletrotécnico GO

## Objetivo
Victor e Carlos são sócios com acesso `admin`, individual. Carlos criará a própria senha quando for convidado. Futuramente o mesmo mecanismo atenderá colaboradores `comercial` e `tecnico`.

## Fluxo desenvolvido na PR #46 (ainda NÃO liberado)
1. Usuário autenticado com perfil `admin` acessa `/gestao/convites` e escolhe nome de usuário e papel.
2. Server Action exige origem HTTPS fixa por `GESTAO_ORIGEM_PUBLICA` (além de Origin/Host), cookie de sessão, RBAC, limite de tentativas e confirmação da senha pessoal para emitir ou revogar; sem origem configurada falha fechada.
3. Função `gestao.emitir_convite` verifica a sessão e o papel admin no banco e grava somente SHA-256 de token aleatório de 32 bytes, vínculo ao emissor, papel e expiração de 24 horas. Registra auditoria. Apenas um convite pendente por login é permitido. Convites expirados são revogados na reemissão.
4. Link secreto é exibido **uma única vez** na interface autenticada. Administração copia e compartilha privadamente, sem envio automático de e-mail. O token está no fragmento `#` da URL, não no path/query enviados ao servidor.
5. Em `/gestao/convite`, o convidado informa nome e senha própria (mínimo 12 caracteres, com confirmação). O browser remove o fragmento imediatamente após ler; o token é enviado somente no POST autenticado por Origem, protegido por limite de tentativas.
6. Função `gestao.aceitar_convite` faz `SELECT ... FOR UPDATE` no convite e, em operação atômica, cria usuário, atribui perfil previamente definido e marca consumo. Sessões não são criadas automaticamente. Convidado entra em `/gestao/login`.
7. Função `gestao.revogar_convite` exige sessão admin válida no próprio PostgreSQL. A interface permite revogar convites pendentes, com validação de Origin, RBAC e revalidação da sessão pelo banco.

8. A listagem administrativa é obtida por `gestao.listar_convites` (migration 007), que limita a 100 registros, verifica a sessão admin diretamente no banco e retorna somente login, perfil, datas e estado; nunca retorna tokens ou hashes.

## Bloqueador de segurança

A auditoria identificou que a role SQL `gestao_app` pode fabricar sessões administrativas. A mitigação na branch retirou dela a capacidade de emitir/listar/revogar convites, criou uma role independente `gestao_convites` e passou a exigir a senha pessoal do administrador nas ações sensíveis. Isso diminui o risco de vazamento isolado da conexão comum, mas **não protege o comprometimento conjunto das duas conexões no mesmo runtime**. O recurso **continua não aprovado para produção**. Evidências e plano de correção: [gestao-convites-risco-sessoes.md](gestao-convites-risco-sessoes.md). Os testes funcionais verdes não eliminam esse risco.

## Segurança e menores privilégios
- `gestao_app` NÃO recebe INSERT/UPDATE direto em `gestao.usuarios`, `gestao.usuarios_papeis` nem `gestao.convites`.
- Funções `SECURITY DEFINER` têm `search_path` limitado, SQL estático e `REVOKE EXECUTE FROM PUBLIC`. `gestao_app` pode executar **somente** `aceitar_convite`; `gestao_convites`, com credencial separada em `DATABASE_URL_CONVITES`, pode executar **somente** `emitir_convite`, `listar_convites` e `revogar_convite`. Operações administrativas usam pool SQL distinto.
- O token completo nunca é salvo em tabelas, registrado em auditoria, incluído em query string ou em analytics. Rotas `/gestao` não iniciam medição de marketing. Links não devem ser publicados.
- A funcionalidade está fechada por `GESTAO_HABILITADA=true`, `GESTAO_CONVITES_HABILITADOS=true` e a configuração de `GESTAO_ORIGEM_PUBLICA` para ações. Não definir flags em produção antes da revisão. A origem de produção esperada é `https://eletrotecnicogo.com.br`.
- O banco verifica identidade do emissor pelo hash de uma sessão válida, e não por `ator_id` arbitrário vindo do cliente.
- Contas existentes não são alteradas. A conta genérica `admin` permanece temporariamente ativa.

## Validação automatizada
- Testes unitários: entropia/formato do token, hash, nomes de usuário, expiração e revogação.
- PostgreSQL descartável: emissão negada a técnico, convite usado/revogado/expirado, papel exato e concorrência com duas conexões.
- Teste adversarial: `gestao_app` consegue fabricar sessão, mas tem `42501` ao tentar emitir/listar/revogar; `gestao_convites` não consegue inserir sessões ou aceitar convites. Emissão sem sessão autorizada negada, convites duplicados negados e vencidos substituídos.
- Teste de listagem: admin ativo enxerga convites, técnico/sessão inválida/admin inativo recebem zero linhas; leitura direta da tabela é negada; estados pendente/revogado/expirado são verificados.
- Workflow `gestao-convites-browser.yml`: navegador Playwright, banco e contas de teste descartáveis, HTTPS com proxy local, emissão/aceite com senha individual, login, consumo único, revogação, bloqueio de técnico e token ausente. Conferir CI do último commit.
- CI: lint, Node tests, PostgreSQL descartável, type check/build. Consultar resultado **do último commit** antes de habilitar ou realizar merge.

## Procedimento de implantação — NÃO EXECUTAR ATÉ LIBERAÇÃO

Runbook completo com pré-validação somente leitura, grants, riscos e contingência: [gestao-convites-implantacao.md](gestao-convites-implantacao.md).
1. Conferir PR #46, aprovação da CI atual e teste manual em ambiente isolado. Revisar o plano de recuperação para migrações.
2. Aplicar migrations 005, 006 e 007 com processo de administrador do banco separado da aplicação, sob confirmação explícita. Nunca usar credenciais administrativas no serviço web.
3. Revisar revogação de privilégios administrativos da role `gestao_app` em `db/grants/gestao-app.sql`; criar role `gestao_convites` em processo separado e aplicar `db/grants/gestao-convites.sql`. Não executar a criação de `gestao_app` novamente.
4. Verificar as duas roles e confirmar que `gestao_app` não emite/lista/revoga convites e `gestao_convites` não escreve sessões.
5. Revisar limites de taxa, segurança de URLs, CSRF, registro de eventos e experiência móvel em homologação.
6. Habilitar o painel e os convites **somente com autorização específica**, em implantação controlada. Gerar convite de Carlos e validar primeiro login pessoal.

## Pendências
- Reenvio automático ainda não existe. O procedimento seguro é revogar o convite anterior e gerar um novo, pois o token secreto não pode ser recuperado.
- O teste E2E HTTP em navegador está configurado no CI e cobre token ausente, perfil técnico sem acesso, repetição e limpeza de fragmento; ampliar cenários de erro de senha e segurança de headers antes de ativar.
- Revisão de `SECURITY DEFINER` / proprietário das funções e análise de limites/WAF.
- Revisar o comportamento operacional de reemissão quando o mesmo login possuir convite ativo ou vencido e a decisão sobre verificação adicional de identidade para novos administradores.
- Revisão final e **merge apenas após aprovação**. Nem o código da PR nem as migrations estão em produção.
