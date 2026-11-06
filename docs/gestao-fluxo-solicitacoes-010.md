# Eletrotécnico GO — alteração de etapa das solicitações (release 010)

A tela `/gestao/leads` passa a oferecer **Atualizar etapa** para usuários `admin` ou `comercial`. O SQL é uma função `SECURITY DEFINER` que valida sessão ativa por token original, papel, etapa anterior e próximo status dentro do banco; alteração e auditoria são uma única transação.

## Fluxo de estados

- `novo` → `qualificado` ou `perdido`;
- `qualificado` → `orcamento_em_preparo` ou `perdido`;
- `orcamento_em_preparo` → `orcamento_enviado` ou `perdido`;
- `orcamento_enviado` → `aprovado`, `recusado` ou `perdido`;
- `aprovado`, `recusado`, `perdido`: finais, sem transições automáticas nesta versão.

O formulário envia o status esperado e o destino. Atualizações concorrentes ou submissões desatualizadas não sobrescrevem registros: a função bloqueia a linha e recusa se o estado já mudou. Em sucesso, `gestao.auditoria` registra `ator_id`, `entidade='lead'`, `acao='alterar_status'`, status anterior e novo. O papel `tecnico` lê solicitações, mas não pode alterá-las. `gestao_app` não recebe UPDATE na tabela nem INSERT na auditoria; somente EXECUTE na função restrita.

## Rollout seguro (dois estágios)

**Estágio A — código:** merge de código após CI; o botão de atualização fica oculto e a action bloqueada enquanto `GESTAO_STATUS_HABILITADO` não estiver exatamente `true`. **Não configurar a flag agora.** A versão do site funciona normalmente mesmo com a migration 010 ainda não aplicada.

**Estágio B — banco/feature:** etapa MANUAL e separada, requer decisão específica de operação sobre o PostgreSQL de produção. O usuário já optou por não contratar backup, mas isso mantém o risco real de não conseguir recuperar o banco após uma falha. Recomenda-se uma cópia recuperável antes de executar.

1. Verificar que a versão pública continua estável e que o banco `railway` possui migrations 001–009, com a role SQL `postgres` proprietária de `gestao` e roles `gestao_app`/`gestao_convites` separadas.
2. **Somente após a aprovação operacional:** no GitHub, obter `db/operacoes/gestao-status-010-atomico.sql`, fazer upload desse arquivo ao Console do **Postgres** (não ao Console da aplicação). Verificar SHA-256 e tamanho do arquivo completo.
3. Executar o arquivo inteiro com `psql -X -v ON_ERROR_STOP=1 -U postgres -d railway -f /gestao-status-010-atomico.sql` no terminal PostgreSQL. **Não separar instruções nem executar via campo Query**, pois há transação, checksums e travas. O arquivo aborta se versão, proprietário ou roles não estiverem corretos; executa `COMMIT` apenas após verificar os grants.
4. Validar por SELECT somente-leitura:
   ```sql
   SELECT
     (SELECT count(*) FROM gestao.schema_migrations) AS migrations,
     EXISTS (SELECT 1 FROM gestao.schema_migrations
       WHERE versao='010_gestao_status_leads.sql'
       AND checksum='2c9a9d85cf1fb4acbbee515eef396916c1e27a49c655ddfae28eed4eebad56ba') AS checksum_ok,
     has_function_privilege('gestao_app',
       'gestao.alterar_status_lead(text,uuid,text,text)','EXECUTE') AS exec_app,
     has_function_privilege('gestao_convites',
       'gestao.alterar_status_lead(text,uuid,text,text)','EXECUTE') AS exec_convites,
     has_table_privilege('gestao_app','gestao.leads','UPDATE') AS update_direto;
   ```
   Esperado: `10, true, true, false, false`.
5. Só após esse resultado, configurar `GESTAO_STATUS_HABILITADO=true` no **serviço web** do Railway e executar deploy controlado. Testar uma solicitação de teste usando conta própria e conferir o status/indicador na interface. **Não mudar status de cliente real como teste.**
6. Caso a migration falhe, não habilitar a flag. Se a execução interromper antes de `COMMIT`, o PostgreSQL reverte a transação; depois de `COMMIT`, a reversão automática não se aplica.

## Testes automatizados

O CI aplica as migrations em PostgreSQL descartável e provisiona as roles limitadas. `tests/gestao-status-leads-db.test.mjs` valida transições positivas/negativas, conta técnica sem UPDATE, sessão revogada, usuário inativo, ator correto na auditoria e formulário desatualizado.

Esta entrega não cria outras tabelas, não altera os convites pendentes nem desativa a conta genérica `admin`. A gestão de orçamento e ordem de serviço permanece em planejamento.
