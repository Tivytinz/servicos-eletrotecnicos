import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { criarHashSenha, criarTokenSessao, hashTokenSessao } from "../src/lib/gestao/sessao.ts";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;
const convitesUrl = process.env.GESTAO_TEST_CONVITES_DATABASE_URL;

test("sessão SQL exige senha, não expõe hash e não pode ser fabricada por roles da aplicação", {
  skip: (!adminUrl || !appUrl || !convitesUrl) && "Requer banco descartável CI",
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  const app = new pg.Client({ connectionString: appUrl, connectionTimeoutMillis: 5000 });
  const convites = new pg.Client({ connectionString: convitesUrl, connectionTimeoutMillis: 5000 });
  await Promise.all([admin.connect(), app.connect(), convites.connect()]);
  const usuario = "sess_" + randomUUID().replaceAll("-", "").slice(0, 20);
  const legado = "leg_" + randomUUID().replaceAll("-", "").slice(0, 20);
  const senha = "senha-exclusiva-ci-forte-2026";
  let contaId, legadoId;
  try {
    const { rows: [conta] } = await admin.query(
      "INSERT INTO gestao.usuarios (nome,usuario,senha_hash) VALUES ('Teste Seguro',$1,$2) RETURNING id",
      [usuario, criarHashSenha(senha)],
    );
    contaId = conta.id;
    await admin.query("INSERT INTO gestao.usuarios_papeis (usuario_id,papel_codigo) VALUES ($1,'admin')", [contaId]);
    await admin.query(`INSERT INTO gestao.verificadores_senha(usuario_id,bcrypt_hash)
      VALUES($1,public.crypt(encode(public.digest(convert_to($2,'UTF8'),'sha256'),'hex'),public.gen_salt('bf',12)))`, [contaId, senha]);
    const { rows: [l] } = await admin.query(
      "INSERT INTO gestao.usuarios (nome,usuario,senha_hash) VALUES ('Teste Legado',$1,$2) RETURNING id",
      [legado, criarHashSenha(senha)],
    );
    legadoId = l.id;

    await assert.rejects(app.query("SELECT token_hash FROM gestao.sessoes"), e => e.code === "42501");
    await assert.rejects(app.query("SELECT bcrypt_hash FROM gestao.verificadores_senha"), e => e.code === "42501");
    await assert.rejects(
      app.query("INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour')", [contaId,"c".repeat(64)]),
      e => e.code === "42501",
    );
    await assert.rejects(
      app.query("UPDATE gestao.sessoes SET usuario_id=$1 WHERE false", [contaId]),
      e => e.code === "42501",
    );
    await assert.rejects(
      convites.query("SELECT gestao.emitir_sessao_segura($1,$2,$3)", [usuario,senha,"a".repeat(64)]),
      e => e.code === "42501",
    );

    const solicitar = async (nome, password, token = criarTokenSessao()) =>
      (await app.query("SELECT gestao.emitir_sessao_segura($1,$2,$3) AS id",
        [nome,password,hashTokenSessao(token)])).rows[0].id;
    assert.equal(await solicitar(usuario, "senha-invalida-descartavel-2026"), null);
    assert.equal(await solicitar(legado, senha), null, "usuário legado sem verificador não autentica");
    const token = criarTokenSessao();
    const id = await solicitar(usuario, senha, token);
    assert.ok(id, "senha correta deve criar sessão");
    const { rows: [sessao] } = await admin.query("SELECT usuario_id,token_hash FROM gestao.sessoes WHERE id=$1", [id]);
    assert.equal(sessao.usuario_id, contaId);
    assert.equal(sessao.token_hash, hashTokenSessao(token));

    const { rows: [identidade] } = await app.query(
      "SELECT * FROM gestao.buscar_sessao_segura($1)", [token]);
    assert.equal(identidade.id, contaId);
    assert.deepEqual(identidade.papeis, ["admin"]);
    assert.equal(Object.hasOwn(identidade, "token_hash"), false);
    assert.equal((await app.query(
      "SELECT * FROM gestao.buscar_sessao_segura($1)", [sessao.token_hash])).rowCount, 0,
      "hash extraído do banco não é aceito como token de autenticação");
    assert.equal((await app.query(
      "SELECT gestao.revogar_sessao_segura($1) AS ok", [token])).rows[0].ok, true);
    assert.equal((await app.query(
      "SELECT * FROM gestao.buscar_sessao_segura($1)", [token])).rowCount, 0);
  } finally {
    if (contaId) {
      await admin.query("DELETE FROM gestao.sessoes WHERE usuario_id=$1", [contaId]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [contaId]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [contaId]).catch(() => {});
    }
    if (legadoId) await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [legadoId]).catch(() => {});
    await Promise.all([admin.end(), app.end(), convites.end()]);
  }
});
