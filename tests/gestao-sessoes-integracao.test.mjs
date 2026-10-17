import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { SQL_BUSCAR_SESSAO } from "../src/lib/gestao/queries.ts";

const connectionString = process.env.GESTAO_TEST_DATABASE_URL;

// Este teste usa transação com rollback e banco descartável exclusivo do CI.
// Nunca utilizar DATABASE_URL de produção.
test("sessão válida, revogada, expirada e usuário inativo", {
  skip: !connectionString && "Requer GESTAO_TEST_DATABASE_URL de banco descartável",
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    const usuario = "sessao_teste_" + randomUUID().replaceAll("-", "").slice(0, 18);
    const tokenHash = "a" + randomUUID().replaceAll("-", "").padEnd(63, "0").slice(0, 63);
    const { rows: [conta] } = await client.query(
      "INSERT INTO gestao.usuarios (nome, usuario, senha_hash) VALUES ($1, $2, $3) RETURNING id",
      ["Usuário de teste", usuario, "hash-ficticio-para-teste"],
    );
    await client.query(
      "INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo) VALUES ($1, 'tecnico')",
      [conta.id],
    );
    const { rows: [sessao] } = await client.query(
      `INSERT INTO gestao.sessoes (usuario_id, token_hash, expira_em)
       VALUES ($1, $2, now() + interval '8 hours') RETURNING id`,
      [conta.id, tokenHash],
    );

    const consultarSessao = async () => (await client.query(SQL_BUSCAR_SESSAO, [tokenHash])).rows;
    const ativa = await consultarSessao();
    assert.equal(ativa.length, 1);
    assert.equal(ativa[0].id, conta.id);
    assert.deepEqual(ativa[0].papeis, ["tecnico"]);
    assert.equal((await client.query(SQL_BUSCAR_SESSAO, ["b".repeat(64)])).rows.length, 0);

    await client.query("UPDATE gestao.sessoes SET revogada_em = now() WHERE id = $1", [sessao.id]);
    assert.equal((await consultarSessao()).length, 0, "revogação deve invalidar sessão");
    await client.query("UPDATE gestao.sessoes SET revogada_em = NULL WHERE id = $1", [sessao.id]);

    await client.query(
      `UPDATE gestao.sessoes
       SET criada_em = now() - interval '2 hours', expira_em = now() - interval '1 hour'
       WHERE id = $1`,
      [sessao.id],
    );
    assert.equal((await consultarSessao()).length, 0, "sessão expirada deve ser rejeitada");
    await client.query(
      "UPDATE gestao.sessoes SET expira_em = now() + interval '8 hours' WHERE id = $1",
      [sessao.id],
    );

    await client.query("UPDATE gestao.usuarios SET ativo = false WHERE id = $1", [conta.id]);
    assert.equal((await consultarSessao()).length, 0, "usuário inativo não deve autenticar");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});
