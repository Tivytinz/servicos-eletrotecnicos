# Eletrotécnico GO — implantação SQL de convites e autenticação

**Estado:** procedimento preparado, **ainda não executado na produção**. O responsável autorizou avançar sem contratar backup. Isso deixa perda/corrupção de dados sem recuperação garantida; rollback do código não reverte migrations após COMMIT.

## Inventário conhecido de 05/11/2026

- Banco Railway `railway`, usuário SQL `postgres`, schema `gestao` de propriedade `postgres`; `CREATE` autorizado.
- `pgcrypto`: disponível, mas não instalada; a migration 008 a instala.
- Migrations 001–004: `OK` (SHA-256 igual ao repositório); 005–009: `PENDENTE`. Confirmadas as duas páginas pelo responsável com SQL somente leitura.
- Contas ativas: `victor` e `admin`, ambas `admin`, com hashes scrypt operacionais que os titulares não conhecem. `carlos` será conta individual por convite novo após a ativação de Victor. Não converter `admin` genérico em Carlos.
- `GESTAO_HABILITADA=false` (confirmado pelo responsável) e `GESTAO_CONVITES_HABILITADOS=false` (set via conector com `skipDeploys:true`). `GESTAO_ORIGEM_PUBLICA=https://eletrotecnicogo.com.br` também preparada sem deploy. **Manter ambas as flags false.**
- GitHub main e Railway publicaram o código `33aa44b` com status SUCCESS. O serviço não roda migrations automaticamente. Banco de produção permanece 001–004.

## Artefato SQL preparado

`db/operacoes/gestao-005-009-atomico.sql` contém o conteúdo integral, na ordem, das migrations 005–009 do commit `33aa44b`, com checksums originais e GRANT/REVOKE equivalentes a `db/grants/gestao-app.sql`.

O bundle:
1. Abre **uma transação** com advisory lock; falha se banco/role incorretos, esquema de outro proprietário, role `gestao_app` ausente, versões 001–004 ausentes/divergentes, migrations 005–009 já iniciadas ou objetos novos presentes.
2. Executa 005–009, registra SHA-256 de cada arquivo, instala `pgcrypto` na 008 e revoga sessões antigas.
3. Atualiza grants da role limitada da aplicação, confere isolamento de identidades e sessões e só então executa `COMMIT`.
4. Falha/rollback automático **dentro da execução** se a conexão e o cliente mantêm a transação íntegra; em erro manual no `psql`, usar `ON_ERROR_STOP=1`. O próprio COMMIT torna alterações definitivas; não existe undo das migrations já commitadas.

### Como executar depois da aprovação do teste CI

**Preferir** `psql` em **terminal privado que alcance a rede privada Railway**, usando a credencial administrativa só no processo operacional; não injetar `DATABASE_URL_ADMIN` como variável permanente no serviço web e não compartilhar URL/senha no chat:

```bash
psql -X -v ON_ERROR_STOP=1 "$DATABASE_URL_ADMIN" -f db/operacoes/gestao-005-009-atomico.sql
```

O editor `Postgres > Database > Query` utilizado para os SELECTs **não foi confirmado para transações longas e múltiplas instruções**. Não colar o arquivo fragmentado na interface. Se `psql` privado não estiver disponível, parar para verificar primeiro se o editor permite executar a transação **inteira** sem autocommit entre instruções. Não expor o Postgres por proxy TCP para essa finalidade.

## Depois de aplicar (ainda com flags false)

- Confirmar `SELECT versao FROM gestao.schema_migrations ORDER BY versao;` (001–009), `SELECT extname FROM pg_extension WHERE extname='pgcrypto';` e revisão read-only dos privilégios.
- Criar role isolada `gestao_convites` em terminal privado pelo script `scripts/gestao-provision-convites-role.mjs`; gerar senha segura fora do chat e configurar `DATABASE_URL_CONVITES` na aplicação. Sem role e variável, emissão de convites normais não funciona.
- Definir variáveis de gestão e ativar flags **em momento coordenado**; permitir aceite HTTPS. Emitir primeiro convite para **`victor`** por `scripts/gestao-emitir-convite-inicial.mjs` no terminal privado; entregar o link uma única vez somente ao titular. Depois de acessar e escolher a senha, Victor pode emitir convite de administrador novo para `carlos`.
- O verificador bcrypt dos admins legados ainda será ausente após as migrations. Isso é **esperado** antes dos convites. Não tentar converter hashes scrypt sem saber a senha real, nem duplicar usuários.
- Só então validar acesso, revogação, rate limit e manutenção do site público.

**Importante:** este documento e o arquivo SQL estão em PR de preparação e não autorizam, por si só, executar SQL em produção.