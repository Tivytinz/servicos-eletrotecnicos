import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const url = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("usuário de aplicação só cadastra leads, sem acesso de escrita financeira", { skip: !url }, async () => {
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const nome = "Teste de permissão " + randomUUID();
    const cliente = await client.query(
      "INSERT INTO gestao.clientes (nome) VALUES ($1) RETURNING id", [nome],
    );
    const lead = await client.query(
      "INSERT INTO gestao.leads (cliente_id, descricao) VALUES ($1, $2) RETURNING id",
      [cliente.rows[0].id, "Solicitação de teste"],
    );
    assert.equal(lead.rowCount, 1);
    const consulta = await client.query(
      "SELECT id FROM gestao.leads WHERE id = $1", [lead.rows[0].id],
    );
    assert.equal(consulta.rowCount, 1);
    // Savepoint permite continuar a transação após uma negação de acesso.
    await client.query("SAVEPOINT proibido");
    await assert.rejects(
      client.query("INSERT INTO gestao.lancamentos_financeiros (chave_idempotencia, categoria, valor_centavos) VALUES ($1, 'receita', 1)", [randomUUID()]),
      (error) => error.code === "42501",
    );
    await client.query("ROLLBACK TO SAVEPOINT proibido");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    await pool.end();
  }
});
