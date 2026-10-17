import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { SQL_LIMITAR_LOGIN } from "../src/lib/gestao/queries.ts";
import { chaveTentativaLogin, limitesLogin } from "../src/lib/gestao/limite-login-config.ts";

// Usa somente banco descartável explicitamente destinado a testes.
// Não reutilizar DATABASE_URL da aplicação/produção.
const connectionString = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("chaves de conta e contador global são independentes", () => {
  assert.match(chaveTentativaLogin("global"), /^[a-f0-9]{64}$/);
  assert.notEqual(chaveTentativaLogin("global"), chaveTentativaLogin("identificador", "admin"));
  assert.notEqual(chaveTentativaLogin("identificador", "admin"), chaveTentativaLogin("identificador", "outro"));
  assert.equal(limitesLogin.porIdentificador, 5);
  assert.equal(limitesLogin.global, 300);
  assert.equal(limitesLogin.janelaMinutos, 15);
});

test("limite global é compartilhado entre identificadores distintos e reinicia após a janela", {
  skip: !connectionString && "Requer GESTAO_TEST_APP_DATABASE_URL de banco descartável",
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    const chave = createHash("sha256").update("teste-global-" + randomUUID()).digest("hex");
    for (let tentativa = 1; tentativa <= limitesLogin.global + 1; tentativa++) {
      const resultado = await client.query(SQL_LIMITAR_LOGIN, [chave]);
      if (tentativa === limitesLogin.global || tentativa === limitesLogin.global + 1) {
        assert.equal(Number(resultado.rows[0].tentativas) <= limitesLogin.global,
          tentativa <= limitesLogin.global);
      }
    }
    await client.query(
      "UPDATE gestao.tentativas_login SET inicio_janela = now() - interval '16 minutes' WHERE chave_hash = $1",
      [chave],
    );
    const reiniciada = await client.query(SQL_LIMITAR_LOGIN, [chave]);
    assert.equal(Number(reiniciada.rows[0].tentativas), 1);
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});

test("limite de login permite 5 tentativas, bloqueia a sexta e reinicia após a janela", {
  skip: !connectionString && "Requer GESTAO_TEST_APP_DATABASE_URL de banco descartável",
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    const chave = createHash("sha256").update("teste-login-" + randomUUID()).digest("hex");
    for (let tentativa = 1; tentativa <= 6; tentativa++) {
      const resultado = await client.query(SQL_LIMITAR_LOGIN, [chave]);
      assert.equal(Number(resultado.rows[0].tentativas), tentativa);
      assert.equal(Number(resultado.rows[0].tentativas) <= 5, tentativa <= 5);
    }
    await client.query(
      "UPDATE gestao.tentativas_login SET inicio_janela = now() - interval '16 minutes' WHERE chave_hash = $1",
      [chave],
    );
    const reiniciada = await client.query(SQL_LIMITAR_LOGIN, [chave]);
    assert.equal(Number(reiniciada.rows[0].tentativas), 1);
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});
