import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;

test("release 011: atomicidade, SHA256 real, mínimo privilégio e bloqueio da reexecução", {
  skip: !adminUrl && "Requer PostgreSQL descartável no CI",
}, async () => {
  const database = "gestao_quote_release_" + randomUUID().replaceAll("-", "").slice(0, 15);
  const root = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let db;
  await root.connect();
  try {
    await root.query("CREATE DATABASE " + database);
    const url = new URL(adminUrl);
    url.pathname = "/" + database;
    db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    await db.connect();
    await db.query("CREATE SCHEMA gestao; CREATE TABLE gestao.schema_migrations(versao text PRIMARY KEY,checksum text NOT NULL,aplicada_em timestamptz NOT NULL DEFAULT now());");
    for(const name of ["001_gestao_base.sql","002_gestao_sessoes.sql","003_gestao_login_tentativas.sql","004_gestao_usuario_login.sql"]){
      const sql = await readFile("db/migrations/" + name,"utf8");
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query("INSERT INTO gestao.schema_migrations(versao,checksum) VALUES($1,$2)",
          [name,createHash("sha256").update(sql).digest("hex")]);
        await db.query("COMMIT");
      }catch(err){await db.query("ROLLBACK");throw err;}
    }
    for(const file of ["gestao-005-009-atomico.sql","gestao-status-010-atomico.sql","gestao-orcamentos-011-atomico.sql"]){
      const sql=await readFile("db/operacoes/"+file,"utf8");
      assert.ok(sql.includes("current_database() <> 'railway'"));
      await db.query(sql.replace("current_database() <> 'railway'",
        "current_database() <> '"+database+"'"));
    }
    const migration=await readFile("db/migrations/011_gestao_orcamento_rascunho.sql","utf8");
    const hash=createHash("sha256").update(migration).digest("hex");
    const {rows:[check]}=await db.query(`
      SELECT (SELECT count(*)::int FROM gestao.schema_migrations) AS numero,
        (SELECT checksum FROM gestao.schema_migrations
          WHERE versao='011_gestao_orcamento_rascunho.sql') AS checksum,
        has_function_privilege('gestao_app',
          'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE') AS app_cria,
        has_function_privilege('gestao_app',
          'gestao.listar_orcamentos_restritos(text)','EXECUTE') AS app_lista,
        has_function_privilege('gestao_convites',
          'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE') AS convites_cria,
        has_table_privilege('gestao_app','gestao.orcamentos','INSERT') AS app_insert
    `);
    assert.equal(check.numero,11);
    assert.equal(check.checksum,hash);
    assert.equal(check.app_cria,true);
    assert.equal(check.app_lista,true);
    assert.equal(check.convites_cria,false);
    assert.equal(check.app_insert,false);

    const release=await readFile("db/operacoes/gestao-orcamentos-011-atomico.sql","utf8");
    await assert.rejects(db.query(release.replace("current_database() <> 'railway'",
      "current_database() <> '"+database+"'")),"não reaplicar migration 011");
    await db.query("ROLLBACK");
    const {rows:[final]}=await db.query("SELECT count(*)::int AS numero FROM gestao.schema_migrations");
    assert.equal(final.numero,11);
  }finally{
    if(db)await db.end().catch(()=>{});
    await root.query("DROP DATABASE IF EXISTS "+database+" WITH (FORCE)").catch(()=>{});
    await root.end();
  }
});
