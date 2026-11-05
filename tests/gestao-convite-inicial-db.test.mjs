import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("convite inicial ativa admin preexistente sem senha conhecida e sem duplicar conta", {
  skip: (!adminUrl || !appUrl) && "Requer banco e roles descartáveis de CI",
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  const app = new pg.Client({ connectionString: appUrl, connectionTimeoutMillis: 5000 });
  await Promise.all([admin.connect(), app.connect()]);
  const login = "in_" + randomUUID().replaceAll("-", "").slice(0, 18);
  const outsider = "tec_" + randomUUID().replaceAll("-", "").slice(0, 18);
  const password = "senha-primeiro-convite-descartavel-2026";
  const hash = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hash2 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hash3 = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  let userId, otherId;
  const inviteIds = [];
  try {
    const { rows: [oldAccount] } = await admin.query(
      "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES ('Conta preliminar',$1,'scrypt-legado-desconhecido') RETURNING id",
      [login],
    );
    userId = oldAccount.id;
    await admin.query(
      "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,'admin')",
      [userId],
    );
    const { rows: [nonAdmin] } = await admin.query(
      "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('Técnico preliminar',$1,'hash-legado') RETURNING id",
      [outsider],
    );
    otherId = nonAdmin.id;
    await admin.query(
      "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,'tecnico')",
      [otherId],
    );

    await assert.rejects(
      app.query(
        "INSERT INTO gestao.convites(token_hash,usuario,papel_codigo,criado_por,usuario_existente_id,expira_em) VALUES($1,$2,'admin',NULL,$3,now()+interval '1 day')",
        [hash, login, userId],
      ),
      e => e.code === "42501",
      "gestao_app não consegue emitir bootstrap diretamente",
    );

    const { rows: [invitation] } = await admin.query(
      "INSERT INTO gestao.convites(token_hash,usuario,papel_codigo,criado_por,usuario_existente_id,expira_em) VALUES($1,$2,'admin',NULL,$3,now()+interval '1 day') RETURNING id",
      [hash, login, userId],
    );
    inviteIds.push(invitation.id);

    const { rows: [activated] } = await app.query(
      "SELECT gestao.aceitar_convite($1,$2,$3) AS id",
      [hash, "Administrador em primeiro acesso", password],
    );
    assert.equal(activated.id, userId, "o convite ativa a conta existente");
    const { rows: [state] } = await admin.query(
      "SELECT u.nome,u.senha_hash,(SELECT COUNT(*)::integer FROM gestao.verificadores_senha WHERE usuario_id=u.id) AS verificadores,(SELECT COUNT(*)::integer FROM gestao.usuarios_papeis WHERE usuario_id=u.id AND papel_codigo='admin') AS admins FROM gestao.usuarios u WHERE u.id=$1",
      [userId],
    );
    assert.equal(state.nome, "Administrador em primeiro acesso");
    assert.equal(state.senha_hash, null, "hash legado desconhecido deixa de ser fonte de autenticação");
    assert.equal(state.verificadores, 1);
    assert.equal(state.admins, 1, "papel admin é preservado sem duplicação");
    assert.equal(
      (await admin.query("SELECT COUNT(*)::integer AS total FROM gestao.usuarios WHERE usuario=$1", [login])).rows[0].total,
      1,
    );

    const { rows: [loggedIn] } = await app.query(
      "SELECT gestao.emitir_sessao_segura($1,$2,$3) AS id",
      [login, password, "a".repeat(64)],
    );
    assert.ok(loggedIn.id, "senha escolhida pelo titular funciona para login");
    assert.equal(
      (await app.query("SELECT gestao.aceitar_convite($1,$2,$3) AS id",
        [hash, "Outra Pessoa", "outra-senha-descartavel-2026"])).rows[0].id,
      null,
      "link de uso único não pode trocar senha após ativação",
    );

    const { rows: [second] } = await admin.query(
      "INSERT INTO gestao.convites(token_hash,usuario,papel_codigo,criado_por,usuario_existente_id,expira_em) VALUES($1,$2,'admin',NULL,$3,now()+interval '1 day') RETURNING id",
      [hash2, login, userId],
    );
    inviteIds.push(second.id);
    assert.equal(
      (await app.query("SELECT gestao.aceitar_convite($1,$2,$3) AS id",
        [hash2, "Outra Pessoa", "nova-senha-descartavel-2026"])).rows[0].id,
      null,
      "um segundo bootstrap não pode redefinir senha de conta já ativada",
    );

    const { rows: [wrongRole] } = await admin.query(
      "INSERT INTO gestao.convites(token_hash,usuario,papel_codigo,criado_por,usuario_existente_id,expira_em) VALUES($1,$2,'admin',NULL,$3,now()+interval '1 day') RETURNING id",
      [hash3, outsider, otherId],
    );
    inviteIds.push(wrongRole.id);
    assert.equal(
      (await app.query("SELECT gestao.aceitar_convite($1,$2,$3) AS id",
        [hash3, "Não administra", "senha-errada-para-papel-descartavel"])).rows[0].id,
      null,
      "bootstrap não concede privilégio admin para técnico",
    );
    assert.equal(
      (await admin.query("SELECT COUNT(*)::integer AS total FROM gestao.verificadores_senha WHERE usuario_id=$1",
        [otherId])).rows[0].total, 0,
    );
  } finally {
    if (userId) await admin.query("DELETE FROM gestao.sessoes WHERE usuario_id=$1", [userId]).catch(() => {});
    if (inviteIds.length) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='convite' AND entidade_id = ANY($1::uuid[])", [inviteIds]).catch(() => {});
      await admin.query("DELETE FROM gestao.convites WHERE id = ANY($1::uuid[])", [inviteIds]).catch(() => {});
    }
    for (const id of [userId, otherId].filter(Boolean)) {
      await admin.query("DELETE FROM gestao.verificadores_senha WHERE usuario_id=$1", [id]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [id]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [id]).catch(() => {});
    }
    await Promise.all([app.end(), admin.end()]);
  }
});
