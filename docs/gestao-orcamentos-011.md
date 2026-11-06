# Gestão — orçamentos em rascunho (release 011)

## Objetivo

Permitir que administrador/comercial converta uma solicitação **qualificada** em um rascunho de orçamento, com valor monetário exato em centavos, condições técnicas, data de validade e registro do responsável. O orçamento é criado com **versão 1 / status rascunho** e a solicitação passa automaticamente para `orcamento_em_preparo`, se estava em `qualificado`.

**Esta entrega NÃO envia orçamentos, NÃO gera PDF, NÃO permite aprovação e NÃO cria OS.** Isso requer fluxo próprio de revisão, aceite formal e regras de consistência. Não confundir clicar "Salvar rascunho" com uma proposta aceita pelo cliente.

## Segurança

- O site verifica sessão, papel `orcamentos:gerir`, origem do POST e flag `GESTAO_ORCAMENTOS_HABILITADOS`.
- PostgreSQL revalida token de sessão ativo, usuário ativo, role `admin/comercial`, estado do lead, valores e validade. A função executa sob `SECURITY DEFINER`, `search_path` fechado, tabelas qualificadas e `SELECT FOR UPDATE` no lead.
- Um rascunho inicial por solicitação. Requests paralelos esperam a trava; o segundo pedido não gera proposta extra. Versões posteriores exigirão interface separada.
- `gestao_app` recebe **somente EXECUTE nas duas funções restritas**, sem `SELECT`/`INSERT` direto em `gestao.orcamentos`, `gestao.orcamento_versoes` ou auditoria. `gestao_convites` não recebe EXECUTE.
- A função de listagem não retorna contatos, hashes ou tokens; dados comerciais só são entregues se a sessão é válida e o usuário tem papel permitido.
- A criação registra ator e lead no histórico de auditoria. Não grava, cobra ou movimenta qualquer valor financeiro real.

## Rollout em duas etapas (sem ações automáticas no banco de produção)

**Etapa 1 — código:** merge após CI verde. Como `GESTAO_ORCAMENTOS_HABILITADOS` **não existe/não está true** no Railway, a rota /gestao/orcamentos é fechada, os links são ocultos, a action não usa a função e o deploy não altera o banco.

**Etapa 2 — SQL de produção, somente quando decidido pelo responsável:** o banco atual tem 10 migrations. O pacote `db/operacoes/gestao-orcamentos-011-atomico.sql` contém a migration inteira, transação, checksums e pré/pós-validação, sem alterar registros comerciais existentes. A operação SQL de produção é separada do merge e implica risco real enquanto não houver backup recuperável.

1. Confirmar `railway`, schema `gestao`, role `postgres`, histórico 10/10 e roles `gestao_app`/`gestao_convites`.
2. Obter o arquivo completo `db/operacoes/gestao-orcamentos-011-atomico.sql` do commit aprovado, subir ao **Console do Postgres** no Railway (nunca ao editor parcial Query).
3. **Após decisão explícita de aplicar:** executar o arquivo inteiro com `psql -X -v ON_ERROR_STOP=1 -U postgres -d railway -f /gestao-orcamentos-011-atomico.sql`; verificar `COMMIT`. Falhas antes do COMMIT revertem a transação, mas não substituem backup.
4. Validar por SELECT:
   ```sql
   SELECT
     (SELECT count(*) FROM gestao.schema_migrations) AS migracoes,
     EXISTS(SELECT 1 FROM gestao.schema_migrations
       WHERE versao='011_gestao_orcamento_rascunho.sql'
         AND checksum='f693e6d06891898e2dbcb38049a2b9005113e1fa9dd7cf3b277203943b6f18ef') AS checksum_ok,
     has_function_privilege('gestao_app',
       'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE') AS criar,
     has_function_privilege('gestao_app',
       'gestao.listar_orcamentos_restritos(text)','EXECUTE') AS listar,
     has_function_privilege('gestao_convites',
       'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE') AS convites_criar,
     has_table_privilege('gestao_app','gestao.orcamentos','INSERT') AS insercao_direta;
   ```
   Esperado: `11, t, t, t, f, f`.
5. **Somente após 11/11 e grants confirmados:** configurar `GESTAO_ORCAMENTOS_HABILITADOS=true` no serviço web do Railway. Verificar CI/redeploy SUCCESS, entrar como Victor e usar somente a solicitação "Cliente Teste" para validar rascunho, valor/validade e transição para orçamento em preparo.
6. Confirme o histórico de auditoria e os indicadores. Se algo falhar, desabilitar somente a flag e investigar, sem apagar orçamentos reais.

## Cobertura

- `tests/gestao-orcamentos-db.test.mjs`: conversão BRL segura, datas, verificação de perfis, expiração, draft único, versão 1, trilha de auditoria, isolamento SQL, conta inativa.
- `tests/gestao-orcamentos-release-db.test.mjs`: pacote 011 em PostgreSQL descartável, checksum da fonte, mínimo privilégio, bloqueio de reaplicação.
- `tests/gestao-convites-browser.mjs`: fluxo de criação de orçamento no navegador HTTPS e restrição ao perfil técnico, apenas CI.

## Estado do projeto

Sem novas dependências pagas, serviços, envs secretas ou alteração dos registros de produção nesta entrega de código. O protótipo inicial de orçamentos é deliberadamente limitado a **rascunho versionado**.
