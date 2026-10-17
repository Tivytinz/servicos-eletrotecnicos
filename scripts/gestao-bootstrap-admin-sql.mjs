#!/usr/bin/env node
// Gera SQL de provisionamento do primeiro administrador, SEM conectar ao banco.
// Executar apenas em terminal privado e colar a saída no Console do Postgres.
// O hash scrypt é um verificador sensível: não registrar em CI, issues ou prints.
import { criarHashSenha } from "../src/lib/gestao/sessao.ts";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const senha = process.env.ADMIN_PASSWORD || "";
delete process.env.ADMIN_PASSWORD;

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
    || senha.length < 12 || senha.length > 1024) {
  process.stderr.write("E-mail inválido ou senha fora de 12 a 1024 caracteres. Nenhum SQL gerado.\n");
  process.exit(1);
}
const literal = (value) => "'" + value.replaceAll("'", "''") + "'";
const hash = criarHashSenha(senha);
process.stdout.write(`-- Execute APENAS no Console privado do Postgres como administrador.
-- SQL atômico: se o e-mail já existir, nenhuma associação será criada.
WITH novo_admin AS (
  INSERT INTO gestao.usuarios (nome, email, senha_hash)
  VALUES ('Administrador Eletrotécnico GO', ${literal(email)}, ${literal(hash)})
  RETURNING id
)
INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo)
SELECT id, 'admin' FROM novo_admin;
-- Esperado: INSERT 0 1. Não execute novamente.
SELECT u.email, p.papel_codigo FROM gestao.usuarios u
JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
WHERE u.email = ${literal(email)};
`);
