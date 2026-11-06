import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import pg from "pg";

test("preflight 015 consulta somente leitura e confere hashes, funções e grants",{
  skip:!process.env.GESTAO_TEST_DATABASE_URL && "Requer PostgreSQL descartável do CI",
},async()=>{
  const sql=await readFile("db/operacoes/gestao-preflight-015-somente-leitura.sql","utf8");
  assert.match(sql,/BEGIN TRANSACTION READ ONLY;/);
  assert.match(sql,/ROLLBACK;/);
  assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\s+(?:INTO\s+)?gestao\./i);
  const db=new pg.Client({connectionString:process.env.GESTAO_TEST_DATABASE_URL});
  await db.connect();
  try {
    const r=await db.query(sql);
    const selects=r.filter(x=>x.command==="SELECT");
    assert.equal(selects.length,5);
    assert.ok(selects[1].rows[0].migrations_aplicadas>=15);
    assert.deepEqual(selects[2].rows.map(x=>x.verificacao),
      ["INTEGRA","INTEGRA","INTEGRA","INTEGRA"]);
    assert.equal(selects[3].rows.length,2);
    assert.ok(selects[3].rows.every(x=>x.privilegios_globais_restritos));
    const v=selects[4].rows[0];
    for(const k of ["links_015_presentes","funcao_015_emitir","funcao_015_revogar",
      "funcao_015_consultar","funcao_015_responder","funcao_015_listar","app_pode_responder"]){
      assert.equal(v[k],true,k+" deve existir após 015");
    }
    for(const k of ["convites_podem_responder","app_pode_alterar_orcamento_direto",
      "app_pode_criar_os_direto","app_pode_receber_direto"]){
      assert.equal(v[k],false,k+" deve estar bloqueado");
    }
  } finally {await db.end();}
});
