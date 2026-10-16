import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

const url = process.env.GESTAO_TEST_DATABASE_URL;
test("migrations e privilégios PostgreSQL (requer serviço no CI)", { skip: !url }, async () => {
  const pool = new Pool({ connectionString: url });
  try {
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'gestao'
    `);
    const names = new Set(tables.rows.map((r) => r.tablename));
    for (const name of ["usuarios", "leads", "clientes", "ordens_servico",
      "recebimentos", "lancamentos_financeiros", "sessoes", "tentativas_login"]) {
      assert.equal(names.has(name), true, name);
    }
    const tentativa = await pool.query(`
      INSERT INTO gestao.tentativas_login (chave_hash)
      VALUES (repeat('a', 64)) ON CONFLICT (chave_hash)
      DO UPDATE SET tentativas = gestao.tentativas_login.tentativas + 1
      RETURNING tentativas
    `);
    assert.ok(tentativa.rows[0].tentativas >= 1);
  } finally {
    await pool.end();
  }
});
