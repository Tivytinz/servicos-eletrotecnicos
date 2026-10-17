import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { criarHashSenha } from "../src/lib/gestao/sessao.ts";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;
const convitesUrl = process.env.GESTAO_TEST_CONVITES_DATABASE_URL;

test("gestao_app emite/aceita/revoga apenas por funções protegidas, sem INSERT direto em identidades", {
  skip: (!adminUrl || !appUrl || !convitesUrl) && "Requer PostgreSQL e role descartáveis do CI",
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  const app = new pg.Client({ connectionString: appUrl, connectionTimeoutMillis: 5000 });
  const convites = new pg.Client({ connectionString: convitesUrl, connectionTimeoutMillis: 5000 });
  await Promise.all([admin.connect(), app.connect(), convites.connect()]);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 20);
  const nomeAdmin = "ad_" + suffix;
  const nomeConvite = "nv_" + suffix;
  const nomeRevogado = "rv_" + suffix;
  const sessaoHash = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hashConvite = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const hashRevogado = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  let adminId, contaId;
  const idsConvites = [];
  try {
    const { rows: [ator] } = await admin.query(
      "INSERT INTO gestao.usuarios (nome, usuario, senha_hash) VALUES ($1,$2,$3) RETURNING id",
      ["Administrador de teste", nomeAdmin, "hash-de-teste"],
    );
    adminId = ator.id;
    await admin.query("INSERT INTO gestao.usuarios_papeis (usuario_id,papel_codigo) VALUES ($1,'admin')", [adminId]);
    await admin.query("INSERT INTO gestao.sessoes (usuario_id,token_hash,expira_em) VALUES ($1,$2,now()+interval '1 hour')", [adminId,sessaoHash]);

    await assert.rejects(
      app.query("INSERT INTO gestao.usuarios (nome,usuario,senha_hash) VALUES ('Abuso',$1,'hash')", ["abuso_" + suffix]),
      (e) => e.code === "42501",
    );
    await assert.rejects(
      app.query("INSERT INTO gestao.usuarios_papeis (usuario_id,papel_codigo) VALUES ($1,'admin')", [adminId]),
      (e) => e.code === "42501",
    );
    await assert.rejects(
      app.query("INSERT INTO gestao.convites (token_hash,usuario,papel_codigo,criado_por,expira_em) VALUES ($1,$2,'admin',$3,now()+interval '1 day')", [hashConvite, nomeConvite, adminId]),
      (e) => e.code === "42501",
    );


    // Mesmo com INSERT de sessão permitido à role comum, as funções
    // administrativas não devem ser executáveis com essas credenciais.
    const hashForjado = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    await app.query(
      "INSERT INTO gestao.sessoes (usuario_id,token_hash,expira_em) VALUES ($1,$2,now()+interval '1 hour')",
      [adminId, hashForjado],
    );
    await assert.rejects(
      app.query("SELECT gestao.emitir_convite($1,$2,$3,$4)", [hashForjado, "e".repeat(64), "forjado_" + suffix, "admin"]),
      e => e.code === "42501",
      "sessão fabricada pela role comum não permite emissão administrativa",
    );
    await assert.rejects(
      app.query("SELECT * FROM gestao.listar_convites($1)", [hashForjado]),
      e => e.code === "42501",
    );
    await assert.rejects(
      convites.query("INSERT INTO gestao.sessoes (usuario_id,token_hash,expira_em) VALUES ($1,$2,now()+interval '1 hour')", [adminId, "a".repeat(64)]),
      e => e.code === "42501",
      "role de convites não pode forjar sessões",
    );
    await assert.rejects(
      convites.query("SELECT gestao.aceitar_convite($1,$2,$3)", ["a".repeat(64), "Teste", criarHashSenha("senha-descartavel-testes-2026")]),
      e => e.code === "42501",
    );
    const emitidoSemSessao = await convites.query(
      "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id", ["f".repeat(64),hashConvite,nomeConvite,"admin"],
    );
    assert.equal(emitidoSemSessao.rows[0].id, null);
    const emitido = await convites.query(
      "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id", [sessaoHash,hashConvite,nomeConvite,"tecnico"],
    );
    const conviteId = emitido.rows[0].id;
    assert.ok(conviteId);
    idsConvites.push(conviteId);
    // Só pode haver um convite não revogado e não utilizado para o mesmo login.
    const duplicado = await convites.query(
      "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id",
      [sessaoHash, "d".repeat(64), nomeConvite, "admin"],
    );
    assert.equal(duplicado.rows[0].id, null, "dois convites ativos para o mesmo login são proibidos");

    const aceito = await app.query(
      "SELECT gestao.aceitar_convite($1,$2,$3) AS id",
      [hashConvite, "Convidado Teste", criarHashSenha("senha-segura-descartavel-2026")],
    );
    contaId = aceito.rows[0].id;
    assert.ok(contaId);
    const repetido = await app.query(
      "SELECT gestao.aceitar_convite($1,$2,$3) AS id",
      [hashConvite, "Outro Nome", criarHashSenha("outra-senha-descartavel-2026")],
    );
    assert.equal(repetido.rows[0].id, null);
    const { rows: papeis } = await admin.query(
      "SELECT papel_codigo FROM gestao.usuarios_papeis WHERE usuario_id=$1", [contaId],
    );
    assert.deepEqual(papeis.map(x => x.papel_codigo), ["tecnico"]);

    const aRevogar = await convites.query(
      "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id",
      [sessaoHash,hashRevogado,nomeRevogado,"admin"],
    );
    assert.ok(aRevogar.rows[0].id);
    idsConvites.push(aRevogar.rows[0].id);
    const semPermissao = await convites.query(
      "SELECT gestao.revogar_convite($1,$2) AS revogado",
      ["f".repeat(64),aRevogar.rows[0].id],
    );
    assert.equal(semPermissao.rows[0].revogado, false);
    const revogado = await convites.query(
      "SELECT gestao.revogar_convite($1,$2) AS revogado",
      [sessaoHash,aRevogar.rows[0].id],
    );
    assert.equal(revogado.rows[0].revogado, true);
    const revogadoAceito = await app.query(
      "SELECT gestao.aceitar_convite($1,$2,$3) AS id",
      [hashRevogado, "Não deveria criar", criarHashSenha("terceira-senha-descartavel-2026")],
    );
    assert.equal(revogadoAceito.rows[0].id, null);

    // Um convite vencido pode ser substituído, mas o anterior vira revogado.
    const nomeVencido = "ve_" + suffix;
    const hashAntigo = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const hashNovo = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
    const { rows: [antigo] } = await convites.query(
      "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id",
      [sessaoHash, hashAntigo, nomeVencido, "comercial"],
    );
    assert.ok(antigo.id);
    idsConvites.push(antigo.id);
    await admin.query(
      "UPDATE gestao.convites SET criado_em=now()-interval '2 days', expira_em=now()-interval '1 day' WHERE id=$1",
      [antigo.id],
    );
    const { rows: [substituto] } = await convites.query(
      "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id",
      [sessaoHash, hashNovo, nomeVencido, "comercial"],
    );
    assert.ok(substituto.id);
    idsConvites.push(substituto.id);
    assert.notEqual(antigo.id, substituto.id);
    const { rows: [anterior] } = await admin.query(
      "SELECT revogado_em FROM gestao.convites WHERE id=$1", [antigo.id],
    );
    assert.ok(anterior.revogado_em);
  } finally {
    if (idsConvites.length) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='convite' AND entidade_id = ANY($1::uuid[])", [idsConvites]).catch(() => {});
      await admin.query("DELETE FROM gestao.convites WHERE id = ANY($1::uuid[])", [idsConvites]).catch(() => {});
    }
    if (contaId) {
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [contaId]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [contaId]).catch(() => {});
    }
    if (adminId) {
      await admin.query("DELETE FROM gestao.sessoes WHERE usuario_id=$1", [adminId]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [adminId]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [adminId]).catch(() => {});
    }
    await Promise.all([app.end(), admin.end(), convites.end()]);
  }
});
