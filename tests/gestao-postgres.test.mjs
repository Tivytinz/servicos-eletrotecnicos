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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query(
        "INSERT INTO gestao.usuarios (nome, usuario, email, senha_hash) VALUES ($1, $2, NULL, $3) RETURNING id",
        ["Administrador Teste", "admin", "hash-de-teste"],
      );
      assert.equal(created.rowCount, 1);
      await assert.rejects(
        client.query(
          "INSERT INTO gestao.usuarios (nome, usuario, email, senha_hash) VALUES ($1, $2, NULL, $3)",
          ["Duplicado", "admin", "hash-de-teste"],
        ),
        /duplicate key value|unique constraint/,
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }

  } finally {
    await pool.end();
  }
});
