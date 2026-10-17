-- Login por nome de usuário sem e-mail obrigatório; compatível com contas legadas.
ALTER TABLE gestao.usuarios ADD COLUMN usuario text;
ALTER TABLE gestao.usuarios ALTER COLUMN email DROP NOT NULL;
ALTER TABLE gestao.usuarios
  ADD CONSTRAINT usuarios_identificador_obrigatorio CHECK (email IS NOT NULL OR usuario IS NOT NULL),
  ADD CONSTRAINT usuarios_nome_login_formato CHECK (
    usuario IS NULL OR (usuario ~ '^[a-z][a-z0-9_.-]{2,31}$' AND usuario = lower(trim(usuario)))
  ),
  ADD CONSTRAINT usuarios_nome_login_unico UNIQUE (usuario);
-- PostgreSQL UNIQUE permite NULLs múltiplos; logins são únicos quando preenchidos.
