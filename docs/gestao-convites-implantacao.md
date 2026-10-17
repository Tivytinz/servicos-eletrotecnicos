# Implantação controlada de convites — Eletrotécnico GO

**Estado:** plano de implantação, **não é autorização para aplicar em produção**.
**PR:** #46; requer revisão de segurança, CI do último commit e autorização explícita de mudança operacional.

> ⚠️ **BLOQUEADOR ATUAL:** [risco de falsificação de sessões SQL](gestao-convites-risco-sessoes.md). A role `gestao_app` ainda pode criar/alterar sessões e a função de emissão confia nesses registros. **Não executar migrations nem grants em produção enquanto a correção da fronteira de confiança não for implementada e testada.**

## Condições de liberação
- `GESTAO_HABILITADA` e `GESTAO_CONVITES_HABILITADOS` devem continuar desativadas durante a preparação.
- Confirmar URL pública `https://eletrotecnicogo.com.br` para configurar **`GESTAO_ORIGEM_PUBLICA=https://eletrotecnicogo.com.br`**, sem caminho, query, hash, espaços ou barra final obrigatória.
- Validar a role `gestao_app` e que a aplicação web continua usando **somente** a URL SQL restrita. **Nunca** definir `DATABASE_URL_ADMIN` no serviço web.
- Confirmar estado de deploy, eventuais PRs conflitantes, migrações anteriores e plano de recuperação. Banco com volume persistente **não é backup**. O usuário adiou o backup pago, portanto **não fazer uma operação irreversível sem nova avaliação do risco**.
- Testes de navegador HTTPS, CI de PostgreSQL descartável e auditoria de permissões precisam passar no último commit da PR.

## Pré-validação somente leitura (Console PostgreSQL)
```sql
SELECT versao FROM gestao.schema_migrations ORDER BY versao;
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles
WHERE rolname = 'gestao_app';
SELECT to_regclass('gestao.usuarios') AS usuarios,
       to_regclass('gestao.sessoes') AS sessoes;
```
**Não colar senhas, conexões, tokens ou SQL com hashes em conversas, screenshots ou issues.**

## Plano de aplicação — somente após aprovação explícita
1. Tirar snapshot/backup recuperável e verificar possibilidade de restauração conforme orçamento aprovado; se indisponível, obter decisão específica sobre prosseguir sem backup.
2. Executar migrations em processo operacional isolado, **como proprietário do schema**, com `DATABASE_URL_ADMIN`, nunca na construção do site:
   `node scripts/gestao-migrate.mjs --check` (saída 1 quando existem pendências).
   Após revisão e confirmação operacional: `GESTAO_MIGRATIONS_CONFIRM=APLICAR_GESTAO node scripts/gestao-migrate.mjs --apply`.
   Migrations esperadas nesta PR: `005_gestao_convites.sql`, `006_gestao_convites_funcoes.sql` e `007_gestao_listar_convites.sql`.
3. **A role `gestao_app` já existe em produção**: não executar novamente `gestao-provision-role.mjs`, pois recusa role existente. Aplicar os quatro grants de EXECUTE previstos em `db/grants/gestao-app.sql`, executando o script completo como proprietário do schema com `psql -v app_role=gestao_app -f db/grants/gestao-app.sql` em ambiente operacional separado. Não executar o arquivo da aplicação web usando credenciais administrativas.
4. Fazer consulta somente leitura para confirmar que os privilégios corretos foram concedidos e que escrita direta nas identidades é proibida.
5. Com versão de código devidamente revisada e implantada, registrar `GESTAO_ORIGEM_PUBLICA` na configuração do serviço web e conferir HTTPS, domínio e cabeçalhos do proxy. **Não habilitar** as flags de gestão até confirmação específica.
6. Habilitar de modo controlado `GESTAO_HABILITADA` e `GESTAO_CONVITES_HABILITADOS` após aprovação explícita; validar login de Victor, acesso RBAC, emissão e aceite de um convite de teste sem dados reais. Somente depois emitir link privado para Carlos.

## Consulta de privilégios após grants (somente leitura)
```sql
SELECT
  has_function_privilege('gestao_app', 'gestao.emitir_convite(text,text,text,text)', 'EXECUTE') AS emitir,
  has_function_privilege('gestao_app', 'gestao.aceitar_convite(text,text,text)', 'EXECUTE') AS aceitar,
  has_function_privilege('gestao_app', 'gestao.revogar_convite(text,uuid)', 'EXECUTE') AS revogar,
  has_function_privilege('gestao_app', 'gestao.listar_convites(text)', 'EXECUTE') AS listar,
  has_table_privilege('gestao_app', 'gestao.usuarios', 'INSERT') AS insere_usuarios,
  has_table_privilege('gestao_app', 'gestao.usuarios_papeis', 'INSERT') AS atribui_papeis,
  has_table_privilege('gestao_app', 'gestao.convites', 'INSERT') AS insere_convites;
```
Esperado: as quatro primeiras colunas **true**, as três últimas **false**.

## Contingência
- Se ocorrer erro antes de habilitar, **não habilitar as flags**. O executor de migrations controla suas próprias transações e registra checksums; corrigir somente após diagnosticar.
- Após habilitar, em incidente de segurança, **desabilitar imediatamente `GESTAO_CONVITES_HABILITADOS`** e, se necessário, `GESTAO_HABILITADA`; suspender criação de convites e investigar auditoria.
- **Não fazer DROP de funções, tabelas nem reverter migrações em produção sem backup/avaliação específica**: desabilitar flags interrompe funcionalidade, mas não restaura o banco.
- Se um link for perdido ou potencialmente exposto, o administrador deve **revogá-lo** e emitir outro; nunca recuperar `token_hash` ou fabricar token a partir dele.

## Riscos residuais
- Convite é credencial de posse (*bearer token*); quem obtém link válido antes do destinatário poderá criar a conta. Compartilhar exclusivamente com destinatário verificado por canal privado. Considerar confirmação de identidade adicional antes de convidar outros administradores.
- Regras de rate limiting no banco impedem abuso simples, mas não substituem proteção na borda contra negação de serviço.
- A homologação automatizada é execução de CI com certificados locais; não substitui teste operacional do domínio real nem backup.
