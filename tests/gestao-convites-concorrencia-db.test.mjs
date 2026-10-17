import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { SQL_EMITIR_CONVITE, SQL_ACEITAR_CONVITE } from "../src/lib/gestao/convites-sql.ts";

const url = process.env.GESTAO_TEST_DATABASE_URL;

test("aceites simultâneos para o mesmo token criam somente uma conta", {
  skip: !url && "Requer PostgreSQL descartável (GESTAO_TEST_DATABASE_URL)",
}, async () => {
  // Conexões separadas são essenciais para exercitar bloqueio e concorrência.
  const setup = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  const um = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  const dois = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await Promise.all([setup.connect(), um.connect(), dois.connect()]);
  const unique = randomUUID().replaceAll("-", "").slice(0, 20);
  const adminNome = "adm_" + unique;
  const convidado = "inv_" + unique;
  const tokenHash = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  let adminId;
  let conviteId;
  let convidadoId;
  try {
    const { rows: [admin] } = await setup.query(
      "INSERT INTO gestao.usuarios (nome, usuario, senha_hash) VALUES ($1, $2, $3) RETURNING id",
      ["Admin teste", adminNome, "hash-de-teste"],
    );
    adminId = admin.id;
    await setup.query("INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo) VALUES ($1, 'admin')", [adminId]);
    const emitido = await setup.query(SQL_EMITIR_CONVITE, [tokenHash, convidado, "tecnico", adminId]);
    assert.equal(emitido.rowCount, 1);
    conviteId = emitido.rows[0].id;
    const respostas = await Promise.all([
      um.query(SQL_ACEITAR_CONVITE, [tokenHash, "Convidado", "hash-teste-a"]),
      dois.query(SQL_ACEITAR_CONVITE, [tokenHash, "Convidado", "hash-teste-b"]),
    ]);
    assert.deepEqual(respostas.map(r => r.rowCount).sort(), [0, 1]);
    const { rows: usuarios } = await setup.query(
      "SELECT u.id, p.papel_codigo FROM gestao.usuarios u JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id WHERE u.usuario=$1",
      [convidado],
    );
    assert.equal(usuarios.length, 1);
    assert.equal(usuarios[0].papel_codigo, "tecnico");
    convidadoId = usuarios[0].id;
    const { rows: [c] } = await setup.query("SELECT usado_em, usuario_criado_id FROM gestao.convites WHERE id=$1", [conviteId]);
    assert.ok(c.usado_em);
    assert.equal(c.usuario_criado_id, convidadoId);
  } finally {
    // O runner usa exclusivamente um banco de testes descartável.
    if (conviteId) await setup.query("DELETE FROM gestao.convites WHERE id=$1", [conviteId]).catch(() => {});
    if (convidadoId) {
      await setup.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [convidadoId]).catch(() => {});
      await setup.query("DELETE FROM gestao.usuarios WHERE id=$1", [convidadoId]).catch(() => {});
    }
    if (adminId) {
      await setup.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [adminId]).catch(() => {});
      await setup.query("DELETE FROM gestao.usuarios WHERE id=$1", [adminId]).catch(() => {});
    }
    await Promise.all([setup.end(), um.end(), dois.end()]);
  }
});
