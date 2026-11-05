import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const migrationNames = [
  "001_gestao_base.sql",
  "002_gestao_sessoes.sql",
  "003_gestao_login_tentativas.sql",
  "004_gestao_usuario_login.sql",
];

test("bundle operacional 005–009 instala em transação única, grants mínimos e recusa reexecução", {
  skip: !adminUrl && "Requer PostgreSQL descartável no CI",
}, async () => {
  const tempName = "gestao_bundle_" + randomUUID().replaceAll("-", "").slice(0, 20);
  const root = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let testDb;
  await root.connect();
  try {
    // Nome gerado internamente com letras/números/underscore, nunca input externo.
    await root.query("CREATE DATABASE " + tempName);
    const targetUrl = new URL(adminUrl);
    targetUrl.pathname = "/" + tempName;
    testDb = new pg.Client({ connectionString: targetUrl.toString(), connectionTimeoutMillis: 5000 });
    await testDb.connect();

    await testDb.query(
      "CREATE SCHEMA gestao; CREATE TABLE gestao.schema_migrations(versao text PRIMARY KEY, checksum text NOT NULL, aplicada_em timestamptz NOT NULL DEFAULT now());",
    );
    for (const name of migrationNames) {
      const sql = await readFile(path.join("db", "migrations", name), "utf8");
      await testDb.query("BEGIN");
      try {
        await testDb.query(sql);
        await testDb.query(
          "INSERT INTO gestao.schema_migrations(versao,checksum) VALUES($1,$2)",
          [name, createHash("sha256").update(sql).digest("hex")],
        );
        await testDb.query("COMMIT");
      } catch (err) {
        await testDb.query("ROLLBACK");
        throw err;
      }
    }

    const { rows: [legacy] } = await testDb.query(
      "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('Administrador antigo','victor','hash-legado-operacional') RETURNING id",
    );
    await testDb.query(
      "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,'admin')",
      [legacy.id],
    );
    const release = await readFile("db/operacoes/gestao-005-009-atomico.sql", "utf8");
    // Única adaptação para CI: banco isolado tem outro nome; as migrations e GRANTs
    // são testados exatamente como o artefato de produção.
    const sqlCi = release.replace("current_database() <> 'railway'",
      "current_database() <> '" + tempName + "'");
    assert.notEqual(sqlCi, release, "guard de DB precisa existir para impedir destino errado");
    await testDb.query(sqlCi);

    const { rows: [result] } = await testDb.query(
      "SELECT (SELECT count(*)::int FROM gestao.schema_migrations) AS migrations, (SELECT count(*)::int FROM gestao.usuarios WHERE usuario='victor') AS usuarios, (SELECT senha_hash FROM gestao.usuarios WHERE usuario='victor') AS legado, EXISTS(SELECT 1 FROM pg_extension WHERE extname='pgcrypto') AS crypto, has_function_privilege('gestao_app','gestao.aceitar_convite(text,text,text)','EXECUTE') AS aceita, has_table_privilege('gestao_app','gestao.usuarios','SELECT') AS le_usuarios, has_table_privilege('gestao_app','gestao.sessoes','INSERT') AS insere_sessoes",
    );
    assert.equal(result.migrations, 9);
    assert.equal(result.usuarios, 1, "não deve duplicar admin existente");
    assert.equal(result.legado, "hash-legado-operacional",
      "schema change não altera o hash até convite inicial");
    assert.equal(result.crypto, true);
    assert.equal(result.aceita, true);
    assert.equal(result.le_usuarios, false);
    assert.equal(result.insere_sessoes, false);

    await assert.rejects(
      testDb.query(sqlCi),
      "bundle deve impedir reaplicação e não danificar o banco",
    );
    await testDb.query("ROLLBACK");
    assert.equal(
      (await testDb.query("SELECT count(*)::int AS total FROM gestao.schema_migrations")).rows[0].total,
      9,
    );
  } finally {
    if (testDb) await testDb.end().catch(() => {});
    await root.query("DROP DATABASE IF EXISTS " + tempName + " WITH (FORCE)").catch(() => {});
    await root.end();
  }
});
