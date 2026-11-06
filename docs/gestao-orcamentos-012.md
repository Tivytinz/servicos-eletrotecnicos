# Gestão — revisão de rascunhos versionados (release 012)

**Situação desta PR:** desenvolvimento separado da `main`; não aplicado ao PostgreSQL de produção e não habilitado no Railway. O teste visual de criação do orçamento fictício **Cliente Teste / R$ 350,00** é evidência da etapa 011, não prova que a 012 está implantada.

## O que muda

- O rascunho existente recebe o comando **Revisar rascunho**, somente para administrador/comercial e somente com a flag própria habilitada.
- Ao salvar, a versão atual é verificada no PostgreSQL e é inserida uma **nova linha** em `gestao.orcamento_versoes`; a versão antiga não é modificada nem excluída.
- `gestao.orcamentos.versao_atual` passa para a nova versão, e `gestao.auditoria` registra responsável, versão anterior e nova.
- A versão apresentada na listagem corresponde à atual. As anteriores permanecem preservadas no banco; **a consulta visual do histórico completo ainda não é entregue nesta etapa**.
- Ainda **não** há envio automático/manual, registro de envio, aceite/rejeição, PDF, OS nem faturamento.

## Segurança e concorrência

A Server Action exige as flags `GESTAO_HABILITADA=true`, `GESTAO_ORCAMENTOS_HABILITADOS=true` e `GESTAO_ORCAMENTOS_REVISAO_HABILITADA=true`, sessão, permissão `orcamentos:gerir` e origem autorizada. PostgreSQL revalida token, sessão ativa, usuário ativo, papel admin/comercial, dados, validade e estado de orçamento/lead. A função SECURITY DEFINER usa `search_path` fechado e o banco só concede `EXECUTE` à `gestao_app`. A role `gestao_convites` continua proibida. `gestao_app` não recebe `UPDATE/INSERT` direto nas tabelas de orçamento.

A revisão usa `SELECT ... FOR UPDATE` no orçamento e a **versão esperada** do formulário, impedindo que duas revisões simultâneas sejam aceitas sobre a mesma versão. Se a versão mudou, a sessão expirou ou o orçamento deixou de ser rascunho, a operação falha sem gravar outra versão. Uma revisão não muda o estado do lead, não confirma envio e não gera cobrança.

## Implantação em dois estágios

1. **Código:** executar `npm run check`, testes PostgreSQL isolados e CI. Abrir/validar PR e integrar apenas depois de revisão. A flag `GESTAO_ORCAMENTOS_REVISAO_HABILITADA` deve permanecer ausente ou diferente de `true`. Assim, o novo formulário não aparece e a action não chama a função 012, mesmo com o site implantado.
2. **SQL de produção, mediante autorização específica:** utilizar somente `db/operacoes/gestao-orcamentos-012-atomico.sql` inteiro, sob role proprietária `postgres`, pelo Console do PostgreSQL, com `psql -X -v ON_ERROR_STOP=1 -U postgres -d railway -f /gestao-orcamentos-012-atomico.sql`. **Não executar automaticamente no build.** O responsável optou por adiar backups por custo e aceita o risco residual; isto **não** autoriza execução em produção. Requer autorização específica antes do SQL, preflight e validação dos controles. O pacote exige 11 migrations anteriores e checa os SHA-256 de 004 e 011, roles e grants. É transacional e falha fechado.
3. Após `COMMIT`, confirmar **12 migrations**, checksum da 012 e apenas EXECUTE de `gestao_app`. Não habilitar flag com 11/12.
4. **Ativação própria:** no serviço web do Railway, definir `GESTAO_ORCAMENTOS_REVISAO_HABILITADA=true` somente depois da validação SQL, CI e deploy saudáveis. Conferir a tela como admin/comercial, jamais como técnico. Testar com o rascunho **Cliente Teste**, sem tocar nos dados comerciais reais.
5. **Reversão de exposição:** se houver falha, desligar apenas a flag de revisão. **Não** apagar versões, alterar dados de clientes nem tentar desfazer migration aplicada manualmente.

## Consulta SQL de verificação pós-implantação (somente leitura)

```sql
SELECT
  (SELECT count(*) FROM gestao.schema_migrations) AS migracoes,
  EXISTS(SELECT 1 FROM gestao.schema_migrations
    WHERE versao='012_gestao_revisao_orcamentos.sql'
    AND checksum='c291dbfa239d99e3796d58ed5a041bca9336180f2b82ba6e798a5af36c9c20b6') AS checksum_ok,
  has_function_privilege('gestao_app',
    'gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)','EXECUTE') AS app_revisa,
  has_function_privilege('gestao_convites',
    'gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)','EXECUTE') AS convites_revisa,
  has_table_privilege('gestao_app','gestao.orcamentos','UPDATE') AS update_direto,
  has_table_privilege('gestao_app','gestao.orcamento_versoes','INSERT') AS insert_direto;
```

Resultado esperado após aplicação autorizada: **12, true, true, false, false, false**.

## Testes da PR

- `tests/gestao-orcamentos-db.test.mjs`: centavos sem `float` e data local no formulário.
- `tests/gestao-orcamentos-revisao-db.test.mjs`: perfis, sessão, valores, versão obsoleta, duas revisões concorrentes, auditabilidade, imutabilidade da versão original e bloqueio de revisão após envio.
- `tests/gestao-orcamentos-revisao-release-db.test.mjs`: pacote 012 completo em banco descartável, checksums, grants e bloqueio de reaplicação.
- CI `Check`: lint, testes, build, backup/restauração **apenas em banco descartável**.

## Próxima etapa separada (013)

Definir fluxo seguro de **revisão visual da proposta, marcação de envio com evidência e registro formal de aceite/rejeição da versão exata**, sem considerar status `enviado` como confirmação automática de entrega e sem misturar orçamento com pagamento. Avaliar formatos de documento e prova de ciência antes de liberar OS.
