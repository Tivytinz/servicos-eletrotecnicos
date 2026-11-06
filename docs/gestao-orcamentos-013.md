# Gestão — registro manual de envio e resposta à proposta (release 013)

## Status e finalidade
Incremento de desenvolvimento em `feat/gestao-orcamentos-registro-decisao-013`. O código não envia mensagens, não gera PDF, não cobra e não abre OS. Os botões registram **declarações do operador sobre comunicação já realizada**, com referência a uma versão de proposta. Não constituem comprovação técnica de entrega ou assinatura eletrônica do cliente.

A release 012 foi integrada na `main` com CI `Check` verde (commit `27d4034c`). No início desta etapa, o deploy da 012 ainda estava em **BUILDING** no Railway, e a migration 012 **não** tinha confirmação de execução no PostgreSQL de produção. Nunca presumir que uma integração de código significa que o banco já foi migrado.

## Fluxo e regras

- Ao registrar **envio**: exige rascunho da versão atual, solicitação em `orcamento_em_preparo`, validade ainda aberta, canal e referência textual de 12 a 500 caracteres. A transação grava evento imutável, coloca proposta em `enviado`, lead em `orcamento_enviado` e escreve auditoria.
- Ao registrar **aprovação relatada**: exige envio da **mesma versão**, orçamento `enviado`, lead `orcamento_enviado`, validade ainda aberta e nova referência textual. A transação grava evento e marca proposta e lead como `aprovado`; anota data e indicador de declaração interna nos metadados da versão.
- Ao registrar **recusa relatada**: exige envio da mesma versão e estado coerente. A validade não bloqueia registrar recusa. Marca proposta/lead `recusado` e registra evento.
- Status terminais não são reversíveis nesta entrega. Ao recusar, não se cria nova versão automaticamente. Alterações futuras exigirão novo fluxo de renegociação.
- Não se utiliza envio real via WhatsApp/e-mail, webhooks, uploads, assinatura digital, OS ou lançamento financeiro.
- O histórico dos eventos e suas referências é consultado **somente pelo pessoal autorizado**. Os dados textuais são informados por um operador; não colar senhas, tokens, links privados ou dados excessivos.

## Segurança e consistência

- A Server Action exige `GESTAO_HABILITADA=true`, `GESTAO_ORCAMENTOS_HABILITADOS=true` e **`GESTAO_ORCAMENTOS_EVENTOS_HABILITADOS=true`**. A nova flag permanece desativada por padrão.
- Autenticação, permissões `orcamentos:gerir`, `Origin`/`Host` e formatos de entrada são validados no servidor; o PostgreSQL revalida token, conta ativa, sessão não revogada, papel `admin/comercial` e estado.
- Funções `SECURITY DEFINER` com `search_path` restrito e SQL parametrizado; `gestao_app` recebe apenas `EXECUTE`, não `SELECT/INSERT/UPDATE` diretos em tabelas de orçamentos e eventos.
- `gestao_convites` não pode executar essas funções. Duas decisões concorrentes sobre a mesma versão são serializadas por `FOR UPDATE OF o,l`; índice parcial impede aprovações e recusas conflitantes.
- A função existente `gestao.alterar_status_lead` é substituída **na migration 013**, preservando assinatura, para bloquear o atalho de mudança manual para `orcamento_enviado`/`aprovado`/`recusado` caso exista orçamento para o lead. Leads sem orçamento mantêm o comportamento anterior para compatibilidade.
- O estado `aprovado` é uma **declaração interna de aceite relatado**, não documento assinado nem confirmação independente do cliente. Não gera recebimento ou OS.

## Implantação segura, separada de merge

1. Validar PR com `Check` (Postgres descartável, migrations, testes e build) e QA HTTPS. Não executar SQL em produção durante CI.
2. Confirmar **migration 012 aplicada e íntegra** em produção, com exatamente 12/12 e checksum da migration. No momento do início desta etapa, não havia evidência disso.
3. O responsável reafirmou a decisão de **adiar backups de produção por custo**, com ciência do risco de perda irreversível. Isso não é autorização para escrever no banco. Somente mediante **autorização operacional específica**, preflight de checksums/roles e plano de contenção de falhas, executar inteiro `db/operacoes/gestao-orcamentos-013-atomico.sql` via Console PostgreSQL com psql (`-X -v ON_ERROR_STOP=1`), sob role `postgres`. O pacote bloqueia banco, role ou históricos inesperados, grants excessivos e reaplicação. Sem backup recuperável a operação envolve risco real; não executar automaticamente.
4. Confirmar 13 migrations, checksum, grants e disponibilidade das duas funções, sem credencial administrativa no serviço web.
5. Só após isso, configurar a flag `GESTAO_ORCAMENTOS_EVENTOS_HABILITADOS=true` no web Railway, aguardar deploy saudável e fazer teste funcional com dados fictícios, nunca com clientes reais.
6. Em falha: desligar a flag imediatamente e investigar. Não apagar versões nem eventos; rollback do código não desfaz migration já confirmada.

## SQL de verificação somente leitura (após autorização e implantação)

```sql
SELECT
  (SELECT count(*) FROM gestao.schema_migrations) AS migracoes,
  EXISTS(SELECT 1 FROM gestao.schema_migrations
    WHERE versao='013_gestao_eventos_orcamento.sql'
      AND checksum='ad80c236a30c7d86a192c6531ea9747e058a7e299f042905298d609d4c621ecb') AS checksum_ok,
  has_function_privilege('gestao_app',
    'gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)','EXECUTE') AS app_registra,
  has_function_privilege('gestao_app',
    'gestao.listar_eventos_orcamento_restritos(text)','EXECUTE') AS app_lista,
  has_function_privilege('gestao_convites',
    'gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)','EXECUTE') AS convites_registra,
  has_table_privilege('gestao_app','gestao.orcamento_eventos','SELECT') AS app_select;
```

Esperado somente após aplicar a migration: **13, true, true, true, false, false**.

## Cobertura e pendências
- `tests/gestao-orcamentos-eventos-db.test.mjs`: envio, aprovação, rejeições por papel/sessão/versão, bypass do lead, imutabilidade, status terminal, concorrência e histórico protegido.
- `tests/gestao-orcamentos-eventos-release-db.test.mjs`: pacote 013 real aplicado em banco descartável, checksums e privilégios mínimos.
- A suíte HTTPS continua cobrindo autenticação, convites, RBAC e preparação de rascunho. **Não afirmar teste de navegador do novo registro de envio/decisão sem evidência adicional**.
- Próximos incrementos: comprovante anexado protegido, pré-visualização/PDF e confirmação diretamente pelo cliente, antes da criação de OS.

