import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import pg from "pg";

test("preflight SSH 012/013 é read-only e confere catálogo e roles no banco sintético", {
  skip: !process.env.GESTAO_TEST_DATABASE_URL && "Requer PostgreSQL descartável do CI",
}, async () => {
  const sql = await readFile("db/operacoes/gestao-preflight-012-013-somente-leitura.sql", "utf8");
  assert.match(sql, /BEGIN TRANSACTION READ ONLY;/);
  assert.match(sql, /ROLLBACK;/);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\s+(?:INTO\s+)?gestao\./i);

  const client = new pg.Client({ connectionString: process.env.GESTAO_TEST_DATABASE_URL });
  await client.connect();
  try {
    const results = await client.query(sql);
    const selects = results.filter(result => result.command === "SELECT");
    assert.equal(selects.length, 5);
    const numeroDeMigrations = (await readdir("db/migrations")).filter(nome => /^\d{3}_[a-z0-9_]+\.sql$/.test(nome)).length;
    assert.equal(selects[1].rows[0].migrations_aplicadas, numeroDeMigrations);
    assert.ok(selects[2].rows.every(row => row.verificacao === "INTEGRA"));
    assert.equal(selects[3].rows.length, 2);
    assert.ok(selects[3].rows.every(row => row.privilegios_globais_restritos));
    assert.equal(selects[4].rows[0].funcao_012, true);
    assert.equal(selects[4].rows[0].funcao_013, true);
  } finally {
    await client.end();
  }
});
