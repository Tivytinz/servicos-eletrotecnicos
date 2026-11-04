import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { SQL_BUSCAR_SESSAO, SQL_CADASTRAR_LEAD } from "../src/lib/gestao/queries.ts";
import { temPermissao } from "../src/lib/gestao/permissoes.ts";

const url = process.env.GESTAO_TEST_DATABASE_URL;

// Integration at the SQL/session/permission boundary; this is NOT an HTTP or Server Action E2E test.
// CI points to an ephemeral PostgreSQL database. All inserts are rolled back.
test("RBAC usa papéis da sessão real, permite leads somente aos autorizados", {
  skip: !url && "Requer PostgreSQL descartável via GESTAO_TEST_DATABASE_URL",
}, async () => {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query("SELECT count(*)::int AS total FROM gestao.leads");
    const tokenHashes = new Map();
    for (const papel of ["admin", "comercial", "tecnico"]) {
      const unique = randomUUID().replaceAll("-", "");
      const { rows: [usuario] } = await client.query(
        "INSERT INTO gestao.usuarios (nome, usuario, senha_hash) VALUES ($1,$2,$3) RETURNING id",
        ["Usuário de integração", "rbac_" + unique.slice(0, 20), "hash-somente-testes"],
      );
      await client.query(
        "INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo) VALUES ($1,$2)",
        [usuario.id, papel],
      );
      const hash = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
      await client.query(
        "INSERT INTO gestao.sessoes (usuario_id, token_hash, expira_em) VALUES ($1,$2, now() + interval '8 hours')",
        [usuario.id, hash],
      );
      tokenHashes.set(papel, hash);
    }

    let gravacoes = 0;
    async function executarComo(tokenHash, rotulo) {
      const { rows } = tokenHash
        ? await client.query(SQL_BUSCAR_SESSAO, [tokenHash])
        : { rows: [] };
      const permitido = rows.length === 1 && temPermissao(rows[0].papeis, "leads:criar");
      if (!permitido) return false;
      const result = await client.query(SQL_CADASTRAR_LEAD, [
        "Cliente RBAC " + rotulo, null, "site", "Teste autorizado " + rotulo,
      ]);
      assert.equal(result.rowCount, 1);
      gravacoes++;
      return true;
    }

    assert.equal(await executarComo(null, "anonimo"), false);
    assert.equal(await executarComo("f".repeat(64), "invalido"), false);
    assert.equal(await executarComo(tokenHashes.get("tecnico"), "tecnico"), false);
    assert.equal(await executarComo(tokenHashes.get("comercial"), "comercial"), true);
    assert.equal(await executarComo(tokenHashes.get("admin"), "admin"), true);
    assert.equal(gravacoes, 2);

    // A sessão revogada também deve bloquear gravações.
    await client.query("UPDATE gestao.sessoes SET revogada_em = now() WHERE token_hash = $1", [tokenHashes.get("admin")]);
    assert.equal(await executarComo(tokenHashes.get("admin"), "revogado"), false);

    const after = await client.query("SELECT count(*)::int AS total FROM gestao.leads");
    assert.equal(after.rows[0].total - before.rows[0].total, 2, "somente perfis autorizados gravam");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});
