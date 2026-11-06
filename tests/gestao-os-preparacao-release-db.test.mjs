import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;

test("release 014: pacote atômico e hash corretos, sem reaplicação e sem grants diretos", {
  skip: !adminUrl && "Requer PostgreSQL descartável do CI",
}, async () => {
  const name = "gestao_os_release_" + randomUUID().replaceAll("-","").slice(0,15);
  const root = new pg.Client({connectionString:adminUrl,connectionTimeoutMillis:5000});
  let db;
  await root.connect();
  try {
    await root.query("CREATE DATABASE " + name);
    const url=new URL(adminUrl);
    url.pathname="/"+name;
    db=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:5000});
    await db.connect();
    await db.query("CREATE SCHEMA gestao; CREATE TABLE gestao.schema_migrations(versao text PRIMARY KEY, checksum text NOT NULL, aplicada_em timestamptz NOT NULL DEFAULT now())");
    for(const file of ["001_gestao_base.sql","002_gestao_sessoes.sql","003_gestao_login_tentativas.sql","004_gestao_usuario_login.sql"]) {
      const sql=await readFile("db/migrations/"+file,"utf8");
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query("INSERT INTO gestao.schema_migrations(versao,checksum) VALUES($1,$2)",
          [file,createHash("sha256").update(sql).digest("hex")]);
        await db.query("COMMIT");
      } catch(e) {await db.query("ROLLBACK");throw e;}
    }
    for(const file of [
      "gestao-005-009-atomico.sql","gestao-status-010-atomico.sql",
      "gestao-orcamentos-011-atomico.sql","gestao-orcamentos-012-atomico.sql",
      "gestao-orcamentos-013-atomico.sql","gestao-os-014-atomico.sql"
    ]) {
      const sql=await readFile("db/operacoes/"+file,"utf8");
      assert.ok(sql.includes("current_database() <> 'railway'") ||
        sql.includes("current_database()<>'railway'"));
      await db.query(sql.replaceAll("current_database() <> 'railway'", "current_database() <> '"+name+"'")
        .replaceAll("current_database()<>'railway'", "current_database()<>'"+name+"'"));
    }
    const migration=await readFile("db/migrations/014_gestao_os_preparacao.sql","utf8");
    const packageSql=await readFile("db/operacoes/gestao-os-014-atomico.sql","utf8");
    const sha=createHash("sha256").update(migration).digest("hex");
    assert.ok(packageSql.includes(migration),"pacote contém a migration 014 integral");
    assert.ok(packageSql.includes(sha),"pacote contém SHA-256 real da migration");
    const {rows:[status]}=await db.query(`
      SELECT
        (SELECT count(*)::int FROM gestao.schema_migrations) AS total,
        (SELECT checksum FROM gestao.schema_migrations WHERE versao='014_gestao_os_preparacao.sql') AS checksum,
        has_function_privilege('gestao_app','gestao.criar_os_preparacao(text,uuid,integer)','EXECUTE') AS app_prepara,
        has_function_privilege('gestao_convites','gestao.criar_os_preparacao(text,uuid,integer)','EXECUTE') AS convites_prepara,
        has_table_privilege('gestao_app','gestao.ordens_servico','INSERT') AS insere_direto,
        has_table_privilege('gestao_app','gestao.os_eventos','INSERT') AS evento_direto,
        has_table_privilege('gestao_app','gestao.recebimentos','INSERT') AS recebimento_direto
    `);
    assert.deepEqual(status,{
      total:14,checksum:sha,app_prepara:true,convites_prepara:false,
      insere_direto:false,evento_direto:false,recebimento_direto:false,
    });
    await assert.rejects(db.query(packageSql.replaceAll("current_database()<>'railway'","current_database()<>'"+name+"'")));
    await db.query("ROLLBACK");
    const {rows:[{total}]}=await db.query("SELECT count(*)::int AS total FROM gestao.schema_migrations");
    assert.equal(total,14);
  } finally {
    if(db) await db.end().catch(()=>{});
    await root.query("DROP DATABASE IF EXISTS "+name+" WITH (FORCE)").catch(()=>{});
    await root.end();
  }
});
