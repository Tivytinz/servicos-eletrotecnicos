import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("listagem não revela tokens e só atende sessão admin ativa", {
  skip: (!adminUrl || !appUrl) && "Requer banco descartável com role gestao_app",
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  const app = new pg.Client({ connectionString: appUrl, connectionTimeoutMillis: 5000 });
  await Promise.all([admin.connect(), app.connect()]);
  const tag = randomUUID().replaceAll("-", "").slice(0, 18);
  const sessaoAdmin = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const sessaoTecnico = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hash1 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hash2 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hash3 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const adminNome = "la_" + tag;
  const tecnicoNome = "lt_" + tag;
  const conviteNomes = ["lp_" + tag, "lr_" + tag, "le_" + tag];
  const idUsuarios = [];
  const idConvites = [];
  try {
    for (const [nome, papel] of [[adminNome, "admin"], [tecnicoNome, "tecnico"]]) {
      const { rows: [u] } = await admin.query(
        "INSERT INTO gestao.usuarios (nome, usuario, senha_hash) VALUES ('Teste', $1, 'hash-teste') RETURNING id",
        [nome],
      );
      idUsuarios.push(u.id);
      await admin.query("INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo) VALUES ($1,$2)", [u.id, papel]);
    }
    for (const [id, hash] of [[idUsuarios[0], sessaoAdmin], [idUsuarios[1], sessaoTecnico]]) {
      await admin.query(
        "INSERT INTO gestao.sessoes (usuario_id, token_hash, expira_em) VALUES ($1,$2,now()+interval '1 hour')",
        [id, hash],
      );
    }
    for (const [i, hash] of [hash1, hash2, hash3].entries()) {
      const { rows: [r] } = await app.query(
        "SELECT gestao.emitir_convite($1,$2,$3,'comercial') AS id",
        [sessaoAdmin, hash, conviteNomes[i]],
      );
      assert.ok(r.id);
      idConvites.push(r.id);
    }
    await admin.query("UPDATE gestao.convites SET criado_em=now()-interval '2 days', expira_em=now()-interval '1 day' WHERE id=$1", [idConvites[2]]);
    assert.equal((await app.query("SELECT gestao.revogar_convite($1,$2) AS ok", [sessaoAdmin,idConvites[1]])).rows[0].ok, true);
    const ativo = await app.query("SELECT * FROM gestao.listar_convites($1)", [sessaoAdmin]);
    const vistos = ativo.rows.filter(r => conviteNomes.includes(r.usuario));
    assert.equal(vistos.length, 3);
    assert.deepEqual(
      vistos.map(r => r.status).sort(),
      ["expirado", "pendente", "revogado"].sort(),
    );
    assert.ok(vistos.every(r => !("token_hash" in r)), "listagem não pode expor hash do token");
    assert.equal((await app.query("SELECT * FROM gestao.listar_convites($1)", [sessaoTecnico])).rowCount, 0);
    assert.equal((await app.query("SELECT * FROM gestao.listar_convites($1)", ["f".repeat(64)])).rowCount, 0);
    await admin.query("UPDATE gestao.usuarios SET ativo=false WHERE id=$1", [idUsuarios[0]]);
    assert.equal((await app.query("SELECT * FROM gestao.listar_convites($1)", [sessaoAdmin])).rowCount, 0);
    await assert.rejects(
      app.query("SELECT id FROM gestao.convites LIMIT 1"),
      (e) => e.code === "42501",
    );
  } finally {
    if (idConvites.length) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='convite' AND entidade_id = ANY($1::uuid[])", [idConvites]).catch(() => {});
      await admin.query("DELETE FROM gestao.convites WHERE id = ANY($1::uuid[])", [idConvites]).catch(() => {});
    }
    if (idUsuarios.length) {
      await admin.query("DELETE FROM gestao.sessoes WHERE usuario_id = ANY($1::uuid[])", [idUsuarios]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id = ANY($1::uuid[])", [idUsuarios]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id = ANY($1::uuid[])", [idUsuarios]).catch(() => {});
    }
    await Promise.all([app.end(), admin.end()]);
  }
});
