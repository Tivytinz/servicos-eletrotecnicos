import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { SQL_EMITIR_CONVITE, SQL_ACEITAR_CONVITE, SQL_REVOGAR_CONVITE } from "../src/lib/gestao/convites-sql.ts";

const url = process.env.GESTAO_TEST_DATABASE_URL;

test("convites: emissão admin, negação técnico, consumo único, revogação e rollback", {
  skip: !url && "Requer PostgreSQL descartável (GESTAO_TEST_DATABASE_URL)",
}, async () => {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    const criarAtor = async (papel) => {
      const unique = randomUUID().replaceAll("-", "").slice(0, 20);
      const { rows: [u] } = await client.query(
        "INSERT INTO gestao.usuarios (nome, usuario, senha_hash) VALUES ($1,$2,$3) RETURNING id",
        ["Usuário de teste", "ator_" + unique, "hash-de-teste"],
      );
      await client.query("INSERT INTO gestao.usuarios_papeis (usuario_id,papel_codigo) VALUES ($1,$2)", [u.id, papel]);
      return u.id;
    };
    const admin = await criarAtor("admin");
    const tecnico = await criarAtor("tecnico");
    const usuario = "inv_" + randomUUID().replaceAll("-", "").slice(0, 20);
    const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const negar = await client.query(SQL_EMITIR_CONVITE, ["f".repeat(64), usuario, "admin", tecnico]);
    assert.equal(negar.rowCount, 0, "técnico não emite convites");
    const emitido = await client.query(SQL_EMITIR_CONVITE, [token, usuario, "admin", admin]);
    assert.equal(emitido.rowCount, 1);
    const aceite = await client.query(SQL_ACEITAR_CONVITE, [token, "Convidado", "hash-scrypt-ficticio-de-teste"]);
    assert.equal(aceite.rowCount, 1);
    const repetido = await client.query(SQL_ACEITAR_CONVITE, [token, "Convidado", "outro-hash"]);
    assert.equal(repetido.rowCount, 0, "convite usado não permite recriar conta");
    const { rows } = await client.query(
      "SELECT p.papel_codigo FROM gestao.usuarios_papeis p WHERE p.usuario_id=$1",
      [aceite.rows[0].usuario_id],
    );
    assert.deepEqual(rows.map((r) => r.papel_codigo), ["admin"]);
    assert.equal((await client.query(SQL_REVOGAR_CONVITE, [emitido.rows[0].id, admin])).rowCount, 0);

    const usuario2 = "inv_" + randomUUID().replaceAll("-", "").slice(0, 20);
    const token2 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const segundo = await client.query(SQL_EMITIR_CONVITE, [token2, usuario2, "tecnico", admin]);
    assert.equal(segundo.rowCount, 1);
    assert.equal((await client.query(SQL_REVOGAR_CONVITE, [segundo.rows[0].id, admin])).rowCount, 1);
    assert.equal((await client.query(SQL_ACEITAR_CONVITE, [token2, "Outro", "hash"])).rowCount, 0);
    const usuario3 = "inv_" + randomUUID().replaceAll("-", "").slice(0, 20);
    const token3 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const terceiro = await client.query(SQL_EMITIR_CONVITE, [token3, usuario3, "comercial", admin]);
    assert.equal(terceiro.rowCount, 1);
    await client.query("UPDATE gestao.convites SET expira_em = now() - interval '1 minute' WHERE id = $1", [terceiro.rows[0].id]);
    assert.equal((await client.query(SQL_ACEITAR_CONVITE, [token3, "Expirado", "hash"])).rowCount, 0, "convite vencido não cadastra usuário");

  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});
