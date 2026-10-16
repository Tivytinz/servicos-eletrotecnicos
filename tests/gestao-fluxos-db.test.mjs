import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  SQL_BUSCAR_SESSAO, SQL_LIMITAR_LOGIN, SQL_CADASTRAR_LEAD,
} from "../src/lib/gestao/queries.ts";
import {
  criarHashSenha, criarTokenSessao, hashTokenSessao,
} from "../src/lib/gestao/sessao.ts";
import { temPermissao } from "../src/lib/gestao/permissoes.ts";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("sessão válida, revogada, expirada e usuário inativo no PostgreSQL", {
  skip: !adminUrl,
}, async () => {
  const pool = new Pool({ connectionString: adminUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const email = `teste-${randomUUID()}@example.invalid`;
    const user = await client.query(
      "INSERT INTO gestao.usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id",
      ["Usuário de Teste", email, criarHashSenha("Senha-de-teste-segura-2026")],
    );
    const userId = user.rows[0].id;
    await client.query(
      "INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo) VALUES ($1, 'comercial')",
      [userId],
    );
    const token = criarTokenSessao();
    const tokenHash = hashTokenSessao(token);
    const sessao = await client.query(
      "INSERT INTO gestao.sessoes (usuario_id, token_hash, expira_em) VALUES ($1, $2, now() + interval '8 hours') RETURNING id, token_hash",
      [userId, tokenHash],
    );
    assert.equal(sessao.rows[0].token_hash, tokenHash);
    assert.notEqual(sessao.rows[0].token_hash, token);
    let rows = (await client.query(SQL_BUSCAR_SESSAO, [tokenHash])).rows;
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].papeis, ["comercial"]);
    assert.equal(temPermissao(rows[0].papeis, "leads:criar"), true);
    assert.equal(temPermissao(rows[0].papeis, "financeiro:ler"), false);
    assert.equal((await client.query(SQL_BUSCAR_SESSAO, [hashTokenSessao(criarTokenSessao())])).rowCount, 0);

    await client.query("UPDATE gestao.sessoes SET revogada_em = now() WHERE id = $1", [sessao.rows[0].id]);
    assert.equal((await client.query(SQL_BUSCAR_SESSAO, [tokenHash])).rowCount, 0);

    await client.query(
      "UPDATE gestao.sessoes SET revogada_em = NULL, expira_em = now() - interval '1 minute' WHERE id = $1",
      [sessao.rows[0].id],
    );
    assert.equal((await client.query(SQL_BUSCAR_SESSAO, [tokenHash])).rowCount, 0);

    await client.query(
      "UPDATE gestao.sessoes SET expira_em = now() + interval '8 hours' WHERE id = $1",
      [sessao.rows[0].id],
    );
    await client.query("UPDATE gestao.usuarios SET ativo = false WHERE id = $1", [userId]);
    assert.equal((await client.query(SQL_BUSCAR_SESSAO, [tokenHash])).rowCount, 0);
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    await pool.end();
  }
});

test("limite de cinco tentativas por conta compartilhado no PostgreSQL", {
  skip: !appUrl,
}, async () => {
  const pool = new Pool({ connectionString: appUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const chave = createHash("sha256").update(randomUUID()).digest("hex");
    const tentativas = [];
    for (let i = 0; i < 6; i++) {
      const { rows } = await client.query(SQL_LIMITAR_LOGIN, [chave]);
      tentativas.push(rows[0].tentativas);
    }
    assert.deepEqual(tentativas, [1, 2, 3, 4, 5, 6]);
    await client.query(
      "UPDATE gestao.tentativas_login SET inicio_janela = now() - interval '16 minutes' WHERE chave_hash = $1",
      [chave],
    );
    const reinicio = await client.query(SQL_LIMITAR_LOGIN, [chave]);
    assert.equal(reinicio.rows[0].tentativas, 1);
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    await pool.end();
  }
});

test("cadastro parametrizado de lead e cliente é atômico", {
  skip: !appUrl,
}, async () => {
  const pool = new Pool({ connectionString: appUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const nome = "Cliente Teste " + randomUUID();
    const descricao = "Instalação elétrica '); DROP SCHEMA gestao CASCADE; --";
    const cadastro = await client.query(SQL_CADASTRAR_LEAD,
      [nome, "62999999999", "whatsapp", descricao]);
    assert.equal(cadastro.rowCount, 1);
    const registro = await client.query(`
      SELECT c.nome, c.telefone, l.origem, l.descricao
      FROM gestao.leads l JOIN gestao.clientes c ON c.id = l.cliente_id
      WHERE l.id = $1
    `, [cadastro.rows[0].id]);
    assert.equal(registro.rows[0].nome, nome);
    assert.equal(registro.rows[0].descricao, descricao);
    assert.equal(registro.rows[0].origem, "whatsapp");
    assert.equal(registro.rows[0].telefone, "62999999999");
    // Falha de CHECK na tabela lead deve reverter também o cliente do CTE.
    await client.query("SAVEPOINT antes_da_falha");
    await assert.rejects(
      client.query(SQL_CADASTRAR_LEAD, ["AB", null, "site", ""]),
      (error) => error.code === "23514",
    );
    await client.query("ROLLBACK TO SAVEPOINT antes_da_falha");
    assert.equal((await client.query(
      "SELECT count(*)::integer AS total FROM gestao.clientes WHERE nome = 'AB'",
    )).rows[0].total, 0);
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    await pool.end();
  }
});
