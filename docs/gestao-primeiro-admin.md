# Primeiro administrador — provisionamento seguro e manual

**Pré-requisitos:** migrations 001–003 aplicadas, role `gestao_app` verificada, diagnóstico `node scripts/gestao-check-connection.mjs` aprovado. Manter `GESTAO_HABILITADA` ausente/false. Backups foram adiados pelo titular; não cadastrar clientes reais até definir recuperação.

## Por que dois consoles?

O serviço web usa `gestao_app`, que **não deve** receber `INSERT` em `gestao.usuarios` ou `gestao.usuarios_papeis`. Não colocar `DATABASE_URL_ADMIN` nem a senha `postgres` no web, nem temporariamente. O script `gestao-bootstrap-admin-sql.mjs` gera **apenas SQL** com hash scrypt; o operador aplica no Console privado do **Postgres**, autenticado como administrador. A senha original não é impressa nem transmitida ao GitHub.

## 1. Gerar SQL no Console do serviço web

Em **Railway → servicos-eletrotecnicos → Console** (prompt `/app#`), executar as linhas a seguir **uma por vez**:

```bash
read -r -p "E-mail do administrador: " ADMIN_EMAIL
read -r -s -p "Senha forte (12 a 1024 caracteres): " ADMIN_PASSWORD; echo
read -r -s -p "Repita a senha: " ADMIN_PASSWORD_CONFIRM; echo
if [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD_CONFIRM" ]; then ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node scripts/gestao-bootstrap-admin-sql.mjs; else echo "Senhas diferentes; não foi gerado SQL."; fi
unset ADMIN_EMAIL ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM
```

Escolher e-mail pessoal de acesso e senha **única e forte**, preferencialmente gerada pelo gerenciador de senhas. Nas linhas `read -s`, nada aparece na tela; é esperado.

A saída contém `WITH novo_admin AS (...)`, `INSERT ...` e `SELECT ...`. **Copiar somente o bloco SQL gerado**. Ele inclui um **hash de senha sensível**: não compartilhar prints nem copiar para tickets, chats ou arquivos versionados. Se o terminal não aceitar `read -s`, interromper e solicitar método alternativo, nunca escrever a senha literal no comando.

## 2. Aplicar no Console do Postgres

Abrir **Railway → Postgres → Console**, entrar no `psql` com:

```bash
psql -U postgres -d railway
```

Colar o bloco SQL gerado. Esperado: `INSERT 0 1` e a consulta final exibindo e-mail e papel `admin`. Se houver erro de e-mail duplicado, **não apagar usuários nem repetir com `ON CONFLICT`**; investigar.

O comando é atômico (insere usuário e papel juntos). A senha fica armazenada exclusivamente como hash scrypt.

## 3. Conferência e segurança

- Verificar apenas e-mail e papel; **não selecionar `senha_hash`**.
- Não executar novamente se já criou o administrador.
- Não habilitar `GESTAO_HABILITADA` ainda; primeiro validar login/logout, proteção CSRF, limitação de tentativas e permissão dos cadastros.
- A senha do administrador **não é** a senha de `gestao_app` nem a senha do `postgres`.
- Antes de inserir dados reais, ativar backup com teste de restauração.
