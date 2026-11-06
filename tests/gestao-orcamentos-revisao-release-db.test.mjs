import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
test("release 012: pacote transacional, SHA256, roles e reexecução bloqueada", {
  skip: !adminUrl && "Requer PostgreSQL descartável do CI",
}, async () => {
  const database = "gestao_rev_release_" + randomUUID().replaceAll("-", "").slice(0, 15);
  const root = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let db;
  await root.connect();
  try {
    await root.query("CREATE DATABASE " + database);
    const url = new URL(adminUrl);
    url.pathname = "/" + database;
    db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    await db.connect();
    await db.query("CREATE SCHEMA gestao; CREATE TABLE gestao.schema_migrations(versao text PRIMARY KEY,checksum text NOT NULL,aplicada_em timestamptz NOT NULL DEFAULT now())");
    for (const name of [
      "001_gestao_base.sql", "002_gestao_sessoes.sql",
      "003_gestao_login_tentativas.sql", "004_gestao_usuario_login.sql",
    ]) {
      const sql = await readFile("db/migrations/" + name, "utf8");
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query(
          "INSERT INTO gestao.schema_migrations(versao,checksum) VALUES($1,$2)",
          [name, createHash("sha256").update(sql).digest("hex")],
        );
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    }
    for (const file of [
      "gestao-005-009-atomico.sql", "gestao-status-010-atomico.sql",
      "gestao-orcamentos-011-atomico.sql", "gestao-orcamentos-012-atomico.sql",
    ]) {
      const sql = await readFile("db/operacoes/" + file, "utf8");
      assert.ok(sql.includes("current_database() <> 'railway'"));
      await db.query(sql.replace(
        "current_database() <> 'railway'",
        "current_database() <> '" + database + "'",
      ));
    }
    const fonte = await readFile("db/migrations/012_gestao_revisao_orcamentos.sql", "utf8");
    const checksum = createHash("sha256").update(fonte).digest("hex");
    const { rows: [estado] } = await db.query(`
      SELECT
        (SELECT count(*)::int FROM gestao.schema_migrations) AS numero,
        (SELECT checksum FROM gestao.schema_migrations
          WHERE versao='012_gestao_revisao_orcamentos.sql') AS checksum,
        has_function_privilege('gestao_app',
          'gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)','EXECUTE') AS app_revisa,
        has_function_privilege('gestao_convites',
          'gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)','EXECUTE') AS convites_revisa,
        has_table_privilege('gestao_app','gestao.orcamento_versoes','INSERT') AS insert_direto
    `);
    assert.deepEqual(estado, {
      numero: 12, checksum, app_revisa: true, convites_revisa: false, insert_direto: false,
    });
    const pacote = await readFile("db/operacoes/gestao-orcamentos-012-atomico.sql", "utf8");
    await assert.rejects(db.query(pacote.replace(
      "current_database() <> 'railway'", "current_database() <> '" + database + "'",
    )), "não executar pacote 012 duas vezes");
    await db.query("ROLLBACK");
    const { rows: [{ numero }] } = await db.query(
      "SELECT count(*)::int AS numero FROM gestao.schema_migrations",
    );
    assert.equal(numero, 12);
  } finally {
    if (db) await db.end().catch(() => {});
    await root.query("DROP DATABASE IF EXISTS " + database + " WITH (FORCE)").catch(() => {});
    await root.end();
  }
});
