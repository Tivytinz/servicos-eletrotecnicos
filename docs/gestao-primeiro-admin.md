# Primeiro administrador — provisionamento seguro e manual

**Pré-requisitos:** migrations 001–004 aplicadas, role `gestao_app` verificada, diagnóstico `node scripts/gestao-check-connection.mjs` aprovado. Manter `GESTAO_HABILITADA` ausente/false. Backups foram adiados pelo titular; não cadastrar clientes reais até definir recuperação.

## Por que dois consoles?

O serviço web usa `gestao_app`, que **não deve** receber `INSERT` em `gestao.usuarios` ou `gestao.usuarios_papeis`. Não colocar `DATABASE_URL_ADMIN` nem a senha `postgres` no web, nem temporariamente. O script `gestao-bootstrap-admin-sql.mjs` gera **apenas SQL** com hash scrypt; o operador aplica no Console privado do **Postgres**, autenticado como administrador. A senha original não é impressa nem transmitida ao GitHub.

## 0. Aplicar migration 004 no banco real

**Obrigatório antes do bootstrap:** a migration `db/migrations/004_gestao_usuario_login.sql` adiciona `usuario` e torna o e-mail opcional. Após o deploy da nova `main`, abrir o Console do Postgres e executar o conteúdo completo dessa migration, em transação, registrando versão e checksum em `gestao.schema_migrations` conforme `scripts/gestao-migrate.mjs`. Não aplicar novamente 001–003, não editar migrations antigas e não executar `gestao-migrate.mjs --apply` com credencial de superusuário no serviço web. Se não houver forma segura de aplicar 004, parar e solicitar orientação antes do cadastro.

## 1. Gerar SQL no Console do serviço web

Em **Railway → servicos-eletrotecnicos → Console** (prompt `/app#`), executar as linhas a seguir **uma por vez**:

```bash
read -r -p "Usuário do administrador: " ADMIN_USUARIO
read -r -s -p "Senha forte (12 a 1024 caracteres): " ADMIN_PASSWORD; echo
read -r -s -p "Repita a senha: " ADMIN_PASSWORD_CONFIRM; echo
if [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD_CONFIRM" ]; then ADMIN_USUARIO="$ADMIN_USUARIO" ADMIN_PASSWORD="$ADMIN_PASSWORD" node scripts/gestao-bootstrap-admin-sql.mjs; else echo "Senhas diferentes; não foi gerado SQL."; fi
unset ADMIN_USUARIO ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM
```

Escolher **`admin`** como nome de usuário e senha **única e forte**, preferencialmente gerada pelo gerenciador de senhas. Nas linhas `read -s`, nada aparece na tela; é esperado.

A saída contém `WITH novo_admin AS (...)`, `INSERT ...` e `SELECT ...`. **Copiar somente o bloco SQL gerado**. Ele inclui um **hash de senha sensível**: não compartilhar prints nem copiar para tickets, chats ou arquivos versionados. Se o terminal não aceitar `read -s`, interromper e solicitar método alternativo, nunca escrever a senha literal no comando.

## 2. Aplicar no Console do Postgres

Abrir **Railway → Postgres → Console**, entrar no `psql` com:

```bash
psql -U postgres -d railway
```

Colar o bloco SQL gerado. Esperado: `INSERT 0 1` e a consulta final exibindo usuário `admin` e papel `admin`. Se houver erro de usuário duplicado, **não apagar usuários nem repetir com `ON CONFLICT`**; investigar.

O comando é atômico (insere usuário e papel juntos). A senha fica armazenada exclusivamente como hash scrypt.

## 3. Conferência e segurança

- Verificar apenas usuário e papel; **não selecionar `senha_hash`**.
- Não executar novamente se já criou o administrador.
- Não habilitar `GESTAO_HABILITADA` ainda; primeiro validar login/logout, proteção CSRF, limitação de tentativas e permissão dos cadastros.
- A senha do administrador **não é** a senha de `gestao_app` nem a senha do `postgres`.
- Antes de inserir dados reais, ativar backup com teste de restauração.
