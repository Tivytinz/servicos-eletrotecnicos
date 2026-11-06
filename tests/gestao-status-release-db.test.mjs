import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;

test("release 010: transação única, checksum real, grants mínimos e idempotência fechada", {
  skip: !adminUrl && "Requer PostgreSQL descartável no CI",
}, async () => {
  const dbName = "gestao_status_release_" + randomUUID().replaceAll("-", "").slice(0, 15);
  const root = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let db;
  await root.connect();
  try {
    await root.query("CREATE DATABASE " + dbName);
    const u = new URL(adminUrl);
    u.pathname = "/" + dbName;
    db = new pg.Client({ connectionString: u.toString(), connectionTimeoutMillis: 5000 });
    await db.connect();
    await db.query(
      "CREATE SCHEMA gestao; CREATE TABLE gestao.schema_migrations(versao text PRIMARY KEY, checksum text NOT NULL, aplicada_em timestamptz NOT NULL DEFAULT now());",
    );
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
    const bundle5to9 = await readFile("db/operacoes/gestao-005-009-atomico.sql", "utf8");
    assert.ok(bundle5to9.includes("current_database() <> 'railway'"));
    await db.query(bundle5to9.replace(
      "current_database() <> 'railway'", "current_database() <> '" + dbName + "'",
    ));
    const release = await readFile("db/operacoes/gestao-status-010-atomico.sql", "utf8");
    assert.ok(release.includes("current_database() <> 'railway'"));
    const ciRelease = release.replace(
      "current_database() <> 'railway'", "current_database() <> '" + dbName + "'",
    );
    await db.query(ciRelease);
    const migration = await readFile("db/migrations/010_gestao_status_leads.sql", "utf8");
    const expectedHash = createHash("sha256").update(migration).digest("hex");
    const { rows: [check] } = await db.query(
      "SELECT (SELECT COUNT(*)::int FROM gestao.schema_migrations) AS n, (SELECT checksum FROM gestao.schema_migrations WHERE versao='010_gestao_status_leads.sql') AS hash, has_function_privilege('gestao_app','gestao.alterar_status_lead(text,uuid,text,text)','EXECUTE') AS app_exec, has_function_privilege('gestao_convites','gestao.alterar_status_lead(text,uuid,text,text)','EXECUTE') AS convites_exec, has_table_privilege('gestao_app','gestao.leads','UPDATE') AS app_update",
    );
    assert.equal(check.n, 10);
    assert.equal(check.hash, expectedHash);
    assert.equal(check.app_exec, true);
    assert.equal(check.convites_exec, false);
    assert.equal(check.app_update, false);

    await assert.rejects(db.query(ciRelease), "impedir reexecução e alterações parciais");
    await db.query("ROLLBACK");
    assert.equal((await db.query(
      "SELECT COUNT(*)::int AS n FROM gestao.schema_migrations",
    )).rows[0].n, 10);
  } finally {
    if (db) await db.end().catch(() => {});
    await root.query("DROP DATABASE IF EXISTS " + dbName + " WITH (FORCE)").catch(() => {});
    await root.end();
  }
});
