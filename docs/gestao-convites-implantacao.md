# Implantação controlada de convites — Eletrotécnico GO

**Estado:** plano de implantação, **não é autorização para aplicar em produção**.
**PR:** #46; requer revisão de segurança, CI do último commit e autorização explícita de mudança operacional.

> ⚠️ **BLOQUEADOR ATUAL:** [risco de falsificação de sessões SQL](gestao-convites-risco-sessoes.md). A role `gestao_app` ainda pode criar/alterar sessões. A branch já removeu dessa role o EXECUTE administrativo e adicionou `gestao_convites`, porém o risco de comprometimento conjunto das credenciais no runtime permanece. **Não executar migrations nem grants em produção até encerrar a revisão de segurança e do limite de confiança.**

## Condições de liberação
- `GESTAO_HABILITADA` e `GESTAO_CONVITES_HABILITADOS` devem continuar desativadas durante a preparação.
- Confirmar URL pública `https://eletrotecnicogo.com.br` para configurar **`GESTAO_ORIGEM_PUBLICA=https://eletrotecnicogo.com.br`**, sem caminho, query, hash, espaços ou barra final obrigatória.
- Confirmar duas roles limitadas: `gestao_app` para login e aceite, `gestao_convites` para emissão, listagem e revogação. A implementação exige `DATABASE_URL` e `DATABASE_URL_CONVITES` **diferentes**, fornecidas como segredos privados; verificar risco de comprometimento conjunto do runtime. **Nunca** definir `DATABASE_URL_ADMIN` no serviço web.
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
3. **A role `gestao_app` já existe em produção**: não executar novamente `scripts/gestao-provision-role.mjs`. O arquivo `db/grants/gestao-app.sql` deve ser revisado e executado pelo proprietário do schema para **revogar** o EXECUTE de emissão/revogação/listagem da role comum e manter somente o aceite.
4. Criar a role separada `gestao_convites` via processo administrativo isolado, exclusivamente após autorização: `GESTAO_CONVITES_ROLE_CONFIRM=CRIAR_ROLE_CONVITES node scripts/gestao-provision-convites-role.mjs --apply`, passando `GESTAO_CONVITES_PASSWORD` forte e `DATABASE_URL_ADMIN` somente no ambiente operacional. A role não pode gravar sessões ou usuários. Para grants revisados em role existente, usar `db/grants/gestao-convites.sql` como proprietário do schema.
5. Verificar grants de ambas as roles sem exibir credenciais, aplicar configuração de `DATABASE_URL_CONVITES` e `GESTAO_ORIGEM_PUBLICA` ao processo servidor somente após autorização específica. Nunca misturar `DATABASE_URL_CONVITES` com `DATABASE_URL` nem usar conexão administrativa como substituta.
6. Após revisão de risco e autorização, habilitar `GESTAO_HABILITADA` e `GESTAO_CONVITES_HABILITADOS` de modo controlado; validar Victor, a confirmação da própria senha para emitir/revogar e os logs. Só emitir convite real de Carlos depois da homologação operacional.

## Consultas de privilégios após grants (somente leitura)
```sql
SELECT
  has_function_privilege('gestao_app', 'gestao.emitir_convite(text,text,text,text)', 'EXECUTE') AS app_emite,
  has_function_privilege('gestao_app', 'gestao.aceitar_convite(text,text,text)', 'EXECUTE') AS app_aceita,
  has_function_privilege('gestao_app', 'gestao.revogar_convite(text,uuid)', 'EXECUTE') AS app_revoga,
  has_function_privilege('gestao_app', 'gestao.listar_convites(text)', 'EXECUTE') AS app_lista,
  has_function_privilege('gestao_convites', 'gestao.emitir_convite(text,text,text,text)', 'EXECUTE') AS convites_emite,
  has_function_privilege('gestao_convites', 'gestao.aceitar_convite(text,text,text)', 'EXECUTE') AS convites_aceita,
  has_function_privilege('gestao_convites', 'gestao.revogar_convite(text,uuid)', 'EXECUTE') AS convites_revoga,
  has_function_privilege('gestao_convites', 'gestao.listar_convites(text)', 'EXECUTE') AS convites_lista,
  has_table_privilege('gestao_convites', 'gestao.sessoes', 'INSERT') AS convites_grava_sessao,
  has_table_privilege('gestao_app', 'gestao.usuarios', 'INSERT') AS app_cria_usuario;
```
Esperado: somente `app_aceita`, `convites_emite`, `convites_revoga` e `convites_lista` em **true**. Os seis demais resultados devem ser **false**. Não executar essa consulta antes de criar a role isolada.

## Contingência
- Se ocorrer erro antes de habilitar, **não habilitar as flags**. O executor de migrations controla suas próprias transações e registra checksums; corrigir somente após diagnosticar.
- Após habilitar, em incidente de segurança, **desabilitar imediatamente `GESTAO_CONVITES_HABILITADOS`** e, se necessário, `GESTAO_HABILITADA`; suspender criação de convites e investigar auditoria.
- **Não fazer DROP de funções, tabelas nem reverter migrações em produção sem backup/avaliação específica**: desabilitar flags interrompe funcionalidade, mas não restaura o banco.
- Se um link for perdido ou potencialmente exposto, o administrador deve **revogá-lo** e emitir outro; nunca recuperar `token_hash` ou fabricar token a partir dele.

## Riscos residuais
- Convite é credencial de posse (*bearer token*); quem obtém link válido antes do destinatário poderá criar a conta. Compartilhar exclusivamente com destinatário verificado por canal privado. Considerar confirmação de identidade adicional antes de convidar outros administradores.
- Regras de rate limiting no banco impedem abuso simples, mas não substituem proteção na borda contra negação de serviço.
- Separar as credenciais SQL limita o comprometimento isolado de `gestao_app`, mas ainda não protege o comprometimento conjunto de `DATABASE_URL` e `DATABASE_URL_CONVITES` no mesmo processo web. Não classificar esse risco como resolvido.
- A homologação automatizada é execução de CI com certificados locais; não substitui teste operacional do domínio real nem backup.
