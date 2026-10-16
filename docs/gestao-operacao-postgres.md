# PostgreSQL Eletrotécnico GO — operação segura

**Situação em 16/10/2026 (verificação assistida pelo operador):** PostgreSQL 18 online em `production`, volume 5 GB. As migrations `001`–`003` foram aplicadas ao banco `railway` via console do Railway, com `COMMIT` e registro de três versões em `gestao.schema_migrations`. A role `gestao_app` foi criada, senha configurada sem compartilhamento, cinco GRANTs aplicados, privilégios de INSERT em clientes/sessões confirmados e INSERT no livro financeiro negado. Login via `psql -h 127.0.0.1 -U gestao_app -d railway -W` confirmado. `DATABASE_URL` adicionada ao serviço web e novo deploy da branch `main` concluído; **a conexão efetiva da aplicação pela URL ainda não foi verificada**. `GESTAO_HABILITADA` permanece ausente/false; ainda não há admin inicial. Backups adiados por decisão do titular; **não inserir dados reais sem estratégia de recuperação**.

## Topologia e segregação

- Projeto Railway: `upbeat-compassion`; serviço de banco: `Postgres`; região `sfo`; volume persistente `postgres-volume`.
- O banco não possui domínio HTTP nem proxy TCP público, conforme inspeção. Usar **rede privada Railway**; não expor porta 5432 à Internet.
- **Não** colocar `Postgres.DATABASE_URL` diretamente no serviço web: ela usa o proprietário/superusuário. Criar role `gestao_app` com credencial gerada e permissões limitadas; conectar web com URL privada usando essa role.
- Não reutilizar bancos ou credenciais do Agenda Fashion.
- `DATABASE_URL_ADMIN` é operacional, temporária e não deve ficar configurada no serviço web, logs ou repositório.

## Backups e restauração — bloqueio antes de dados reais

1. No Railway, abrir `upbeat-compassion` → `Postgres` → `Backups`.
2. Habilitar backups agendados do volume, avaliar frequência/retenção/custos e confirmar que aparece um snapshot concluído.
3. Avaliar PITR (point-in-time recovery) conforme plano e custo; snapshots só restauram pontos fixos.
4. Em ambiente **descartável e isolado**, restaurar backup, validar tabelas, checksums de migrations e consulta de dados sintéticos. **Não** restaurar sobre o banco ativo para testar.
5. Registrar data, operador, RPO/RTO observado e resultado do teste. Revisar periodicamente.
6. Referência Railway: https://docs.railway.com/guides/postgres-backups-restores

**Backups foram adiados pelo titular nesta etapa.** Volume persistente não equivale a backup; habilitar e testar restauração antes de dados reais.

## Aplicação controlada das migrations

1. Fazer backup/snapshot e validar que o banco correto foi selecionado. Em `production`, revisar mudanças e ter plano de recuperação.
2. Executar a partir de **ambiente operacional dentro da rede privada Railway**, usando Node 24 e dependências instaladas do commit aprovado; sem abrir proxy TCP público.
3. Injetar `DATABASE_URL_ADMIN` somente no processo de migração. Não salvar em arquivo versionado nem exibir seu conteúdo.
4. Primeiro rodar `node scripts/gestao-migrate.mjs --check` (retorna 1 quando há pendências). Depois, somente com autorização para executar no banco real:
   `GESTAO_MIGRATIONS_CONFIRM=APLICAR_GESTAO node scripts/gestao-migrate.mjs --apply`
5. Rodar `node scripts/gestao-migrate.mjs --check` novamente. O executor usa lock, transações e checksums; rejeita drift.
6. Provisionar role SQL com `GESTAO_ROLE_CONFIRM=CRIAR_GESTAO_APP node scripts/gestao-provision-role.mjs --apply`, usando `DATABASE_URL_ADMIN` e `GESTAO_APP_PASSWORD` (senha aleatória de 32–256 caracteres) somente no processo privado. O script cria `gestao_app` com SCRAM-SHA-256, grants mínimos e teste de negação de escrita financeira. **Não** reutilizar a senha de proprietário do banco. Se a role já existir, o script falha sem girar a senha.
7. Validar com conexão da role `gestao_app`: consegue cadastrar clientes/leads e sessões, mas não pode escrever no livro-razão financeiro. O script testa leitura e negação financeira; os testes de CI cobrem também cadastro, sessão e limite de login.
8. Provisionar o primeiro admin **apenas quando** houver aprovação do titular da conta, e nunca em CI.
9. Configurar `DATABASE_URL` privada da role limitada no serviço web **somente depois** dos passos acima. Não habilitar `GESTAO_HABILITADA` até concluir E2E de autenticação, rate limiting IP/WAF, CSRF, LGPD e restore.

### Comandos de validação em CI

O workflow `Check` usa PostgreSQL descartável e aplica migrations duas vezes para provar idempotência, depois verifica checksums, permissões e cadastro de leads. **CI não substitui teste do banco Railway real.**

## Reversão

Não há rollback automático para migrations estruturais. Em falha, o executor desfaz a migration em andamento por transação. Para recuperar mudanças já aplicadas, interromper acessos e restaurar backup verificado em ambiente isolado antes de qualquer operação destrutiva. Não executar `DROP SCHEMA` ou sobrescrever volume sem autorização específica.

## Execução operacional pendente

Em 16/10/2026, o operador executou migrations e criação da role diretamente pelo **Console privado do Postgres no Railway**, após bloqueio da criação de executor temporário pelo conector. A role foi criada manualmente; o script `gestao-provision-role.mjs` é para ambientes novos e **não deve ser executado novamente no banco real**, pois a role já existe. Os checksums foram conferidos com os arquivos do GitHub antes de aplicar. O serviço web recebeu `DATABASE_URL` manualmente; OAuth Railway oculta valores e não prova a correção da URL. Não expor porta 5432, não compartilhar senha, não conceder superusuário ao serviço web.

## Critérios de promoção da branch e liberação

1. Confirmar CI de ponta a ponta na branch consolidada: npm ci, audit, lint, testes, build, PostgreSQL descartável e controle de acesso financeiro.
2. Revisar a árvore de PRs empilhados e promover código à `main` **somente com autorização explícita**, mantendo `GESTAO_HABILITADA` ausente/false.
3. Após merge e deploy, validar que `/gestao/leads` permanece indisponível e não há regressão no site público.
4. Criar admin inicial em execução privada e segura, sem senha em logs/CI, somente com autorização do titular; validar a `DATABASE_URL` a partir do serviço web sem registrar credenciais.
5. Ativar o painel apenas após validação E2E de login, logout, limite de tentativas, autorização de leads, CSRF, LGPD e estratégia de backup/restore.

