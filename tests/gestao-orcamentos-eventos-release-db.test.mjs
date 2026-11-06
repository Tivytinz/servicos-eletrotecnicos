import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
test("release 013: pacote transacional, checksum, mínimos privilégios e reexecução negada", {
  skip: !adminUrl && "Requer PostgreSQL descartável do CI",
}, async () => {
  const database = "gestao_evt_release_" + randomUUID().replaceAll("-", "").slice(0, 15);
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
          [name,createHash("sha256").update(sql).digest("hex")],
        );
        await db.query("COMMIT");
      } catch(error) {
        await db.query("ROLLBACK");
        throw error;
      }
    }
    for (const file of [
      "gestao-005-009-atomico.sql","gestao-status-010-atomico.sql",
      "gestao-orcamentos-011-atomico.sql","gestao-orcamentos-012-atomico.sql",
      "gestao-orcamentos-013-atomico.sql",
    ]) {
      const pacote = await readFile("db/operacoes/" + file, "utf8");
      assert.ok(pacote.includes("current_database() <> 'railway'"));
      await db.query(pacote.replace(
        "current_database() <> 'railway'",
        "current_database() <> '" + database + "'",
      ));
    }
    const fonte = await readFile("db/migrations/013_gestao_eventos_orcamento.sql", "utf8");
    const checksum = createHash("sha256").update(fonte).digest("hex");
    const { rows:[estado] } = await db.query(`
      SELECT
        (SELECT count(*)::int FROM gestao.schema_migrations) AS total,
        (SELECT checksum FROM gestao.schema_migrations
          WHERE versao='013_gestao_eventos_orcamento.sql') AS checksum,
        has_function_privilege('gestao_app','gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)','EXECUTE') AS app_evento,
        has_function_privilege('gestao_app','gestao.listar_eventos_orcamento_restritos(text)','EXECUTE') AS app_lista,
        has_function_privilege('gestao_convites','gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)','EXECUTE') AS convites_evento,
        has_function_privilege('gestao_convites','gestao.listar_eventos_orcamento_restritos(text)','EXECUTE') AS convites_lista,
        has_table_privilege('gestao_app','gestao.orcamento_eventos','SELECT') AS app_select,
        has_table_privilege('gestao_app','gestao.orcamento_eventos','INSERT') AS app_insert
    `);
    assert.deepEqual(estado,{
      total:13, checksum, app_evento:true,app_lista:true,
      convites_evento:false,convites_lista:false,app_select:false,app_insert:false,
    });
    const pacote = await readFile("db/operacoes/gestao-orcamentos-013-atomico.sql","utf8");
    await assert.rejects(db.query(pacote.replace(
      "current_database() <> 'railway'",
      "current_database() <> '" + database + "'",
    )), "bloquear reaplicação 013");
    await db.query("ROLLBACK");
    const {rows:[{total}]} = await db.query(
      "SELECT count(*)::int AS total FROM gestao.schema_migrations",
    );
    assert.equal(total,13);
  } finally {
    if (db) await db.end().catch(()=>{});
    await root.query("DROP DATABASE IF EXISTS " + database + " WITH (FORCE)").catch(()=>{});
    await root.end();
  }
});
