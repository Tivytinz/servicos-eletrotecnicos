import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

test("release 012: revisão preserva versões, exige RBAC e evita perda de concorrência", {
  skip: !process.env.GESTAO_TEST_DATABASE_URL || !process.env.GESTAO_TEST_APP_DATABASE_URL
    ? "Requer PostgreSQL descartável do CI" : false,
}, async () => {
  const admin = new pg.Client({ connectionString: process.env.GESTAO_TEST_DATABASE_URL });
  const app = new pg.Client({ connectionString: process.env.GESTAO_TEST_APP_DATABASE_URL });
  const app2 = new pg.Client({ connectionString: process.env.GESTAO_TEST_APP_DATABASE_URL });
  const ids = { usuarios: [], sessoes: [], cliente: null, lead: null, orcamento: null };
  await admin.connect();
  await app.connect();
  await app2.connect();
  try {
    const { rows: [grants] } = await admin.query(`
      SELECT
        has_function_privilege('gestao_app',
          'gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)','EXECUTE') AS app_revisa,
        has_function_privilege('gestao_convites',
          'gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date)','EXECUTE') AS convites_revisa,
        has_table_privilege('gestao_app','gestao.orcamentos','UPDATE') AS atualiza_direto,
        has_table_privilege('gestao_app','gestao.orcamento_versoes','INSERT') AS versao_direta
    `);
    assert.deepEqual(grants, {
      app_revisa: true, convites_revisa: false,
      atualiza_direto: false, versao_direta: false,
    });

    async function usuarioComSessao(papel) {
      const login = "qa_rev_" + randomUUID().replaceAll("-", "").slice(0, 16);
      const { rows: [{ id }] } = await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES($1,$2,$3) RETURNING id",
        ["QA revisão", login, "placeholder-qa"],
      );
      ids.usuarios.push(id);
      await admin.query(
        "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)", [id, papel],
      );
      const token = randomBytes(32).toString("base64url");
      const { rows: [{ id: sid }] } = await admin.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour') RETURNING id",
        [id, createHash("sha256").update(token).digest("hex")],
      );
      ids.sessoes.push(sid);
      return { id, token };
    }
    const comercial = await usuarioComSessao("comercial");
    const tecnico = await usuarioComSessao("tecnico");
    const { rows: [{ id: cliente }] } = await admin.query(
      "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id",
      ["Cliente QA revisão " + randomUUID()],
    );
    ids.cliente = cliente;
    const { rows: [{ id: lead }] } = await admin.query(
      "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,$2,'qualificado') RETURNING id",
      [cliente, "Ajuste de quadro elétrico em teste automatizado"],
    );
    ids.lead = lead;
    const validade = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { rows: [{ id: orcamento }] } = await app.query(
      "SELECT gestao.criar_orcamento_rascunho($1,$2::uuid,$3::bigint,$4,$5::date) AS id",
      [comercial.token, lead, "35000", "Adequação elétrica com mão de obra", validade],
    );
    assert.ok(orcamento);
    ids.orcamento = orcamento;

    const revisar = async (client, token, versao, valor = "42000",
      descricao = "Proposta revisada com serviço elétrico", data = validade) => {
      const { rows: [{ versao: nova }] } = await client.query(
        "SELECT gestao.revisar_orcamento_rascunho($1,$2::uuid,$3::integer,$4::bigint,$5,$6::date) AS versao",
        [token, orcamento, versao, valor, descricao, data],
      );
      return nova;
    };
    assert.equal(await revisar(app, tecnico.token, 1), null, "técnico bloqueado");
    assert.equal(await revisar(app, randomBytes(32).toString("base64url"), 1), null, "sem sessão");
    assert.equal(await revisar(app, comercial.token, 1, "0"), null, "valor zero");
    assert.equal(await revisar(app, comercial.token, 1, "42000", "Curta"), null, "descrição curta");
    assert.equal(await revisar(app, comercial.token, 1, "42000", "Válida", "2099-12-31"), null, "data inválida");
    assert.equal(await revisar(app, comercial.token, 1), 2, "primeira revisão cria v2");
    assert.equal(await revisar(app, comercial.token, 1), null, "versão obsoleta não sobrescreve");

    const { rows: versoes } = await admin.query(
      "SELECT versao,valor_centavos,descricao FROM gestao.orcamento_versoes WHERE orcamento_id=$1 ORDER BY versao",
      [orcamento],
    );
    assert.deepEqual(versoes.map(v => [v.versao, v.valor_centavos]), [[1, "35000"], [2, "42000"]]);
    assert.equal(versoes[0].descricao, "Adequação elétrica com mão de obra");

    const resultado = await Promise.all([
      revisar(app, comercial.token, 2, "43000"),
      revisar(app2, comercial.token, 2, "44000"),
    ]);
    assert.equal(resultado.filter(v => v === 3).length, 1);
    assert.equal(resultado.filter(v => v === null).length, 1);
    const { rows: [estado] } = await admin.query(
      "SELECT status,versao_atual FROM gestao.orcamentos WHERE id=$1", [orcamento],
    );
    assert.deepEqual(estado, { status: "rascunho", versao_atual: 3 });

    const { rows: eventos } = await admin.query(
      "SELECT ator_id,detalhes FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1 AND acao='revisar_rascunho' ORDER BY criado_em",
      [orcamento],
    );
    assert.equal(eventos.length, 2);
    assert.ok(eventos.every(e => e.ator_id === comercial.id));
    assert.deepEqual(eventos.map(e => [e.detalhes.versao_anterior, e.detalhes.versao_nova]), [[1, 2], [2, 3]]);
    await admin.query("UPDATE gestao.orcamentos SET status='enviado' WHERE id=$1", [orcamento]);
    assert.equal(await revisar(app, comercial.token, 3), null, "enviado não pode ser revisto nesta etapa");
  } finally {
    if (ids.orcamento) {
      await admin.query(
        "DELETE FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1",
        [ids.orcamento],
      ).catch(() => {});
      await admin.query("DELETE FROM gestao.orcamento_versoes WHERE orcamento_id=$1",
        [ids.orcamento]).catch(() => {});
      await admin.query("DELETE FROM gestao.orcamentos WHERE id=$1",
        [ids.orcamento]).catch(() => {});
    }
    if (ids.lead) await admin.query("DELETE FROM gestao.leads WHERE id=$1", [ids.lead]).catch(() => {});
    if (ids.cliente) await admin.query("DELETE FROM gestao.clientes WHERE id=$1", [ids.cliente]).catch(() => {});
    for (const id of ids.sessoes) {
      await admin.query("DELETE FROM gestao.sessoes WHERE id=$1", [id]).catch(() => {});
    }
    for (const id of ids.usuarios) {
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [id]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [id]).catch(() => {});
    }
    await Promise.all([admin.end().catch(() => {}), app.end().catch(() => {}), app2.end().catch(() => {})]);
  }
});
