#!/usr/bin/env node
// Gera SQL para provisionamento privado; nunca usa superusuário no serviço web.
import { criarHashSenha } from "../src/lib/gestao/sessao.ts";
import { normalizarIdentificador } from "../src/lib/gestao/identificador.ts";

const identificador = normalizarIdentificador(process.env.ADMIN_USUARIO || "");
const senha = process.env.ADMIN_PASSWORD || "";
delete process.env.ADMIN_PASSWORD;
if (!identificador || identificador.includes("@") || senha.length < 12 || senha.length > 1024) {
  process.stderr.write("Usuário inválido ou senha fora de 12 a 1024 caracteres. Nenhum SQL gerado.\n");
  process.exit(1);
}
const literal = (value) => "'" + value.replaceAll("'", "''") + "'";
const hash = criarHashSenha(senha);
process.stdout.write(`-- Execute SOMENTE no Console privado do PostgreSQL.
-- Exige migration 004; não repetir se o usuário já existir.
WITH novo_admin AS (
  INSERT INTO gestao.usuarios (nome, usuario, email, senha_hash)
  VALUES ('Administrador Eletrotécnico GO', ${literal(identificador)}, NULL, ${literal(hash)})
  RETURNING id
)
INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo)
SELECT id, 'admin' FROM novo_admin;
-- Esperado: INSERT 0 1
SELECT u.usuario, p.papel_codigo FROM gestao.usuarios u
JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
WHERE u.usuario = ${literal(identificador)};
`);
