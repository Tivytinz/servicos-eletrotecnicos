# PostgreSQL Eletrotécnico GO — operação segura

**Situação em 16/10/2026:** Railway provisionado, PostgreSQL 18 online no ambiente `production`, volume 5 GB. **Nenhuma migration executada no banco real; não há usuários reais.** O site continua na branch `main` e `GESTAO_HABILITADA` deve continuar ausente/false.

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

**Não foi possível ativar backups via conector nesta etapa; isso deve ser confirmado no painel Railway.** Volume persistente não equivale a backup.

## Aplicação controlada das migrations

1. Fazer backup/snapshot e validar que o banco correto foi selecionado. Em `production`, revisar mudanças e ter plano de recuperação.
2. Executar a partir de **ambiente operacional dentro da rede privada Railway**, usando Node 24 e dependências instaladas do commit aprovado; sem abrir proxy TCP público.
3. Injetar `DATABASE_URL_ADMIN` somente no processo de migração. Não salvar em arquivo versionado nem exibir seu conteúdo.
4. Primeiro rodar `node scripts/gestao-migrate.mjs --check` (retorna 1 quando há pendências). Depois, somente com autorização para executar no banco real:
   `GESTAO_MIGRATIONS_CONFIRM=APLICAR_GESTAO node scripts/gestao-migrate.mjs --apply`
5. Rodar `node scripts/gestao-migrate.mjs --check` novamente. O executor usa lock, transações e checksums; rejeita drift.
6. Provisionar role SQL de app e aplicar `db/grants/gestao-app.sql` como proprietário do schema, com `psql -v app_role=gestao_app`. A senha da role deve ser gerada fora do repositório e guardada como segredo.
7. Validar com conexão da role `gestao_app`: consegue cadastrar clientes/leads e sessões, mas não pode escrever no livro-razão financeiro.
8. Provisionar o primeiro admin **apenas quando** houver aprovação do titular da conta, e nunca em CI.
9. Configurar `DATABASE_URL` privada da role limitada no serviço web **somente depois** dos passos acima. Não habilitar `GESTAO_HABILITADA` até concluir E2E de autenticação, rate limiting IP/WAF, CSRF, LGPD e restore.

### Comandos de validação em CI

O workflow `Check` usa PostgreSQL descartável e aplica migrations duas vezes para provar idempotência, depois verifica checksums, permissões e cadastro de leads. **CI não substitui teste do banco Railway real.**

## Reversão

Não há rollback automático para migrations estruturais. Em falha, o executor desfaz a migration em andamento por transação. Para recuperar mudanças já aplicadas, interromper acessos e restaurar backup verificado em ambiente isolado antes de qualquer operação destrutiva. Não executar `DROP SCHEMA` ou sobrescrever volume sem autorização específica.
