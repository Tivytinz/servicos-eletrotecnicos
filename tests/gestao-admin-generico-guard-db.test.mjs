import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const firstFour = [
  "001_gestao_base.sql", "002_gestao_sessoes.sql",
  "003_gestao_login_tentativas.sql", "004_gestao_usuario_login.sql",
];

test("desativação de admin genérico: bloqueia Carlos pendente, exige verifier e preserva acessos", {
  skip: !adminUrl && "Requer PostgreSQL descartável no CI",
}, async () => {
  const database = "gestao_admin_guard_" + randomUUID().replaceAll("-", "").slice(0, 16);
  const root = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let db;
  await root.connect();
  try {
    await root.query("CREATE DATABASE " + database);
    const url = new URL(adminUrl);
    url.pathname = "/" + database;
    db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    await db.connect();
    await db.query(
      "CREATE SCHEMA gestao; CREATE TABLE gestao.schema_migrations(versao text PRIMARY KEY, checksum text NOT NULL, aplicada_em timestamptz NOT NULL DEFAULT now());",
    );
    for (const name of firstFour) {
      const sql = await readFile("db/migrations/" + name, "utf8");
      await db.query("BEGIN");
      try {
        await db.query(sql);
        await db.query(
          "INSERT INTO gestao.schema_migrations (versao, checksum) VALUES ($1,$2)",
          [name, createHash("sha256").update(sql).digest("hex")],
        );
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    }

    const { rows: [victor] } = await db.query(
      "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('Victor','victor','legacy-placeholder') RETURNING id",
    );
    const { rows: [generic] } = await db.query(
      "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('Admin genérico','admin','legacy-placeholder') RETURNING id",
    );
    await db.query(
      "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES ($1,'admin'),($2,'admin')",
      [victor.id, generic.id],
    );

    const bundle = await readFile("db/operacoes/gestao-005-009-atomico.sql", "utf8");
    await db.query(bundle.replace("current_database() <> 'railway'", "current_database() <> '" + database + "'"));

    const verifierSql = "INSERT INTO gestao.verificadores_senha(usuario_id,bcrypt_hash) VALUES ($1, public.crypt('9f0b8d4c2e1a6f9f0b8d4c2e1a6f00000000000000000000000000000000000000',public.gen_salt('bf',12)))";
    await db.query(verifierSql, [victor.id]);

    const source = await readFile("db/operacoes/gestao-admin-generico-desativar.sql", "utf8");
    const sql = source.replace(/^\\set ON_ERROR_STOP on\s*$/m, "")
      .replace("current_database() <> 'railway'", "current_database() <> '" + database + "'");
    assert.notEqual(sql, source, "não deve remover o guard de banco");
    async function denied() {
      await assert.rejects(db.query(sql));
      await db.query("ROLLBACK");
      const { rows: [status] } = await db.query(
        "SELECT ativo FROM gestao.usuarios WHERE usuario = 'admin'",
      );
      assert.equal(status.ativo, true, "falha não desativa conta genérica");
    }

    // Carlos ainda não existe / convite pendente: não desativar a conta anterior.
    await denied();

    const { rows: [carlos] } = await db.query(
      "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('Carlos','carlos',NULL) RETURNING id",
    );
    await db.query(
      "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,'admin')",
      [carlos.id],
    );
    await db.query(verifierSql, [carlos.id]);
    const { rows: [inv] } = await db.query(
      "INSERT INTO gestao.convites(token_hash,usuario,papel_codigo,criado_por,expira_em,usado_em,usuario_criado_id) VALUES($1,'carlos','admin',$2,now()+interval '1 day',now(),$3) RETURNING id",
      [createHash("sha256").update("carlos-ci").digest("hex"), victor.id, carlos.id],
    );

    await db.query(verifierSql, [generic.id]);
    await denied(); // se admin genérico já tem senha, requer revisão humana
    await db.query("DELETE FROM gestao.verificadores_senha WHERE usuario_id=$1", [generic.id]);

    const { rows: [session] } = await db.query(
      "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES ($1,$2,now()+interval '1 hour') RETURNING id",
      [generic.id, "a".repeat(64)],
    );
    await db.query(sql);
    const { rows: status } = await db.query(
      "SELECT u.usuario,u.ativo,(SELECT COUNT(*)::int FROM gestao.verificadores_senha v WHERE v.usuario_id=u.id) AS verifiers FROM gestao.usuarios u WHERE u.usuario IN ('victor','carlos','admin') ORDER BY u.usuario",
    );
    assert.deepEqual(status.map(x => [x.usuario, x.ativo, x.verifiers]),
      [["admin", false, 0], ["carlos", true, 1], ["victor", true, 1]]);
    assert.equal((await db.query("SELECT revogada_em IS NOT NULL AS revogada FROM gestao.sessoes WHERE id=$1",
      [session.id])).rows[0].revogada, true);
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM gestao.auditoria WHERE acao='desativar_admin_generico' AND entidade_id=$1",
      [generic.id])).rows[0].n, 1);
    assert.equal((await db.query("SELECT usado_em IS NOT NULL AS usado FROM gestao.convites WHERE id=$1",
      [inv.id])).rows[0].usado, true, "preserva convite utilizado pelo Carlos");
    await denied(); // já desativada: impossível aplicar de novo
  } finally {
    if (db) await db.end().catch(() => {});
    await root.query("DROP DATABASE IF EXISTS " + database + " WITH (FORCE)").catch(() => {});
    await root.end();
  }
});
