#!/usr/bin/env node
// Uso manual: ADMIN_EMAIL=... ADMIN_PASSWORD=... DATABASE_URL_ADMIN=... node scripts/gestao-bootstrap-admin.mjs
// Não usar URL do usuário de aplicação (sem permissão para criar usuários).
import { Pool } from "pg";
import { criarHashSenha } from "../src/lib/gestao/sessao.ts";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const senha = process.env.ADMIN_PASSWORD || "";
const url = process.env.DATABASE_URL_ADMIN;
if (!url || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || senha.length < 12) {
  process.stderr.write("Defina DATABASE_URL_ADMIN, ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres).\n");
  process.exit(1);
}
const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const registro = await client.query(`
    INSERT INTO gestao.usuarios (nome, email, senha_hash)
    VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id
  `, ["Administrador Eletrotécnico GO", email, criarHashSenha(senha)]);
  if (!registro.rowCount) throw new Error("Usuário já existe: operação cancelada");
  await client.query(`
    INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo)
    VALUES ($1, 'admin')
  `, [registro.rows[0].id]);
  await client.query("COMMIT");
  process.stdout.write("Administrador inicial criado.\n");
} catch (error) {
  await client.query("ROLLBACK");
  process.stderr.write("Falha ao provisionar administrador: " + (error instanceof Error ? error.message : "erro") + "\n");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
