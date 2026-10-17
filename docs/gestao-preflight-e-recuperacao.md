# Pré-implantação e recuperação — Eletrotécnico GO

**Situação:** roteiro de desenvolvimento, não autorização para alterar produção. PR #46 permanece em rascunho.

## Inventário somente leitura

Novo comando: `node scripts/gestao-preflight.mjs --check`.

- Exige `DATABASE_URL_ADMIN` **apenas no terminal operacional privado**, nunca no serviço Next.js, no GitHub ou no navegador.
- Inicia transação `READ ONLY`, valida o catálogo local de migrations e seus checksums contra `gestao.schema_migrations`.
- Confere presença e privilégios globais das roles `gestao_app` e `gestao_convites`, cobertura de verificadores das contas ativas (quando migration 008 já existir) e escrita/leitura de sessões pela role comum.
- Exibe somente totais agregados, situação das migrations e aprovações/bloqueios. **Não imprime nomes de usuários, emails, hashes, senhas ou tokens.**
- É propositalmente limitado: **não verifica backups, permissões do Railway, credenciais efetivas do serviço web, disponibilidade, integridade de dados ou segurança de rede.**
- Saída `0` indica apenas inventário sem inconsistências detectadas; **não significa autorização para merge/produção**. Saída `1` indica bloqueio estrutural e `2` uso indevido.

O CI executa esse inventário contra um **PostgreSQL descartável**, depois de aplicar migrations e provisionar as roles. Não executamos este comando no banco de produção nesta PR.

## Recuperação sem contratação obrigatória de backup gerenciado

É possível avaliar um backup lógico manual com as ferramentas nativas do PostgreSQL, mas isso **não significa ausência garantida de custo**: armazenamento local seguro, tráfego de rede e ambiente de restauração podem ter custo. A opção só será considerada recuperável depois de **restauração testada**, e requer autorização operacional separada.

1. Garantir conexão autorizada ao PostgreSQL por canal privado/TLS; nunca publicar a conexão ou passar senha na linha de comando.
2. Utilizar `pg_dump` em formato `custom` para arquivo fora do repositório, em diretório local com permissões restritas e, idealmente, criptografado.
3. Registrar a data/hora, versão de `pg_dump`, dimensão do arquivo, checksum criptográfico e localização privada. Não anexar o dump ao GitHub/ChatGPT nem armazená-lo junto ao site público.
4. Restaurar com `pg_restore` em **outro PostgreSQL isolado e descartável**, nunca sobre a produção. Validar tabelas, registros, logins de teste e esquema/migrations; `pg_restore --list` sozinho **não prova** recuperação.
5. Confirmar o procedimento para destruir, proteger ou reter a cópia conforme necessidade e minimizar exposição de dados de clientes e hashes de senha.

Uma sugestão de fluxo local, **somente após aprovar a operação e configurar uma conexão privada segura sem senha exposta em argumentos**:

```bash
umask 077
pg_dump --format=custom --no-owner --no-acl \
  --file=gestao-backup-controlado.dump \
  --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$PGDATABASE" --password
sha256sum gestao-backup-controlado.dump
# Somente em outro servidor PostgreSQL, descartável e previamente preparado:
: "${TEST_PGHOST:?defina o host de RESTAURAÇÃO ISOLADA}"
: "${TEST_PGDATABASE:?defina o banco de RESTAURAÇÃO ISOLADO}"
pg_restore --exit-on-error --no-owner --no-acl \
  --host="$TEST_PGHOST" --username="$TEST_PGUSER" --dbname="$TEST_PGDATABASE" \
  gestao-backup-controlado.dump
```

A última etapa exige que `gestao_restore_descartavel` seja banco de teste **preexistente e vazio, isolado da produção**. O comando de exemplo não é autorização para criá-lo na produção. Dependendo da rede privada Railway, pode ser necessário executar o dump em um ambiente operacional conectado à mesma rede.

## Corte coordenado: migrações, verificadores e código

- As migrations 005–009 devem ser planejadas como uma mudança conjunta. A 008 invalida sessões anteriores.
- As contas existentes `victor` e `admin` possuem hashes scrypt anteriores. O novo login exige o verificador bcrypt correspondente, que não pode ser derivado do hash scrypt sem a senha original.
- `scripts/gestao-registrar-verificador.mjs --apply` exige senha atual, validada contra scrypt, e execução administrativa isolada; **não pedir senha no chat**. Sem verificador, a autenticação falha fechada.
- Não executar a migração em etapas desconexas com o site de gestão habilitado. A aplicação precisa utilizar grants compatíveis com o código; rollback só de código não restaura o estado antigo do banco.
- Antes de liberar produção, conferir QA HTTPS, testes adversariais, revisão de `SECURITY DEFINER`, acesso de cada sócio, contingência de credenciais perdidas e nova autorização operacional explícita.

## Critérios de saída

A PR só deve deixar o estado de rascunho após revisão técnica de segurança, testes atualizados, plano de recuperação aprovado, conta(s) legada(s) migráveis e definição da janela de implantação. **Merge, deploy, aplicação das migrations e habilitação de `/gestao` são decisões separadas.** Carlos só receberá convite depois da implantação validada.
