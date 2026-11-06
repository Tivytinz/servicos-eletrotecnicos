import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import pg from "pg";

test("preflight 014 é read-only, checa 004/013/014 e preserva grants", {
  skip: !process.env.GESTAO_TEST_DATABASE_URL && "Requer PostgreSQL descartável do CI",
}, async () => {
  const sql = await readFile("db/operacoes/gestao-preflight-014-somente-leitura.sql","utf8");
  assert.match(sql, /BEGIN TRANSACTION READ ONLY;/);
  assert.match(sql, /ROLLBACK;/);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\s+(?:INTO\s+)?gestao\./i);

  const db = new pg.Client({ connectionString: process.env.GESTAO_TEST_DATABASE_URL });
  await db.connect();
  try {
    const results = await db.query(sql);
    const selects = results.filter(x => x.command === "SELECT");
    assert.equal(selects.length,5);
    assert.equal(selects[1].rows[0].migrations_aplicadas,14);
    assert.deepEqual(selects[2].rows.map(x=>x.verificacao),["INTEGRA","INTEGRA","INTEGRA"]);
    assert.equal(selects[3].rows.length,2);
    assert.ok(selects[3].rows.every(x=>x.privilegios_globais_restritos));
    const a=selects[4].rows[0];
    assert.equal(a.tabela_os_existente,true);
    assert.equal(a.tabela_eventos_os_existente,true);
    assert.equal(a.tabela_eventos_orcamento_existente,true);
    assert.equal(a.funcao_014_criar,true);
    assert.equal(a.funcao_014_candidatas,true);
    assert.equal(a.funcao_014_listar,true);
    assert.equal(a.app_pode_criar,true);
    assert.equal(a.convites_podem_criar,false);
    assert.equal(a.app_pode_inserir_os_direto,false);
    assert.equal(a.app_pode_atualizar_os_direto,false);
    assert.equal(a.app_pode_receber_direto,false);
  } finally {await db.end();}
});
