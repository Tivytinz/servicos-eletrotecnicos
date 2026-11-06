import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { proximosStatusLead, transicaoLeadPermitida } from "../src/lib/gestao/transicoes-leads.ts";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("funil: transições permitidas e finais sem regressão", () => {
  assert.deepEqual(proximosStatusLead("novo"), ["qualificado", "perdido"]);
  assert.deepEqual(proximosStatusLead("qualificado"), ["orcamento_em_preparo", "perdido"]);
  assert.deepEqual(proximosStatusLead("orcamento_em_preparo"), ["orcamento_enviado", "perdido"]);
  assert.deepEqual(proximosStatusLead("orcamento_enviado"), ["aprovado", "recusado", "perdido"]);
  for (const status of ["aprovado", "recusado", "perdido", "desconhecido"]) {
    assert.deepEqual(proximosStatusLead(status), []);
  }
  assert.equal(transicaoLeadPermitida("novo", "aprovado"), false);
  assert.equal(transicaoLeadPermitida("qualificado", "qualificado"), false);
  assert.equal(transicaoLeadPermitida("orcamento_enviado", "aprovado"), true);
});

test("funil no banco: sessão, RBAC, auditoria, concorrência e sem UPDATE direto para a app", {
  skip: !adminUrl || !appUrl ? "Requer PostgreSQL descartável e role gestao_app do CI" : false,
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  const app = new pg.Client({ connectionString: appUrl, connectionTimeoutMillis: 5000 });
  await admin.connect();
  await app.connect();
  const usuarios = [];
  const sessoes = [];
  let leadId = null, clienteId = null;
  try {
    async function criarPessoa(papel) {
      const usuario = "qa_" + randomUUID().replaceAll("-", "").slice(0, 21);
      const { rows: [{ id }] } = await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES ($1,$2,$3) RETURNING id",
        ["Teste de permissão", usuario, "hash-legado-qa"],
      );
      usuarios.push(id);
      await admin.query(
        "INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",
        [id, papel],
      );
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const { rows: [{ id: sessaoId }] } = await admin.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,clock_timestamp()+interval '1 hour') RETURNING id",
        [id, tokenHash],
      );
      sessoes.push(sessaoId);
      return { id, token };
    }
    const titular = await criarPessoa("admin");
    const comercial = await criarPessoa("comercial");
    const tecnico = await criarPessoa("tecnico");
    const { rows: [{ id: cid }] } = await admin.query(
      "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id",
      ["Cliente de QA " + randomUUID()],
    );
    clienteId = cid;
    const { rows: [{ id: lid }] } = await admin.query(
      "INSERT INTO gestao.leads(cliente_id,descricao) VALUES($1,$2) RETURNING id",
      [cid, "Atendimento fictício para teste de status"],
    );
    leadId = lid;

    const alterar = async (token, esperado, proximo) => {
      const { rows: [{ alterado }] } = await app.query(
        "SELECT gestao.alterar_status_lead($1,$2::uuid,$3,$4) AS alterado",
        [token, leadId, esperado, proximo],
      );
      return alterado;
    };

    await assert.rejects(
      app.query("UPDATE gestao.leads SET status='perdido' WHERE id=$1", [leadId]),
      (erro) => erro.code === "42501",
      "gestao_app não deve receber UPDATE direto na tabela",
    );
    assert.equal(await alterar(tecnico.token, "novo", "qualificado"), false, "técnico não altera lead");
    assert.equal(await alterar(randomBytes(32).toString("base64url"), "novo", "qualificado"), false, "token aleatório negado");
    assert.equal(await alterar(titular.token, "novo", "aprovado"), false, "não pode pular etapas");
    assert.equal(await alterar(titular.token, "novo", "qualificado"), true);
    assert.equal(await alterar(titular.token, "novo", "perdido"), false, "formulário desatualizado é rejeitado");
    assert.equal(await alterar(comercial.token, "qualificado", "orcamento_em_preparo"), true);
    assert.equal(await alterar(comercial.token, "orcamento_em_preparo", "orcamento_enviado"), true);
    assert.equal(await alterar(comercial.token, "orcamento_enviado", "aprovado"), true);
    assert.equal(await alterar(titular.token, "aprovado", "novo"), false, "estado terminal não volta a novo");

    const { rows: [lead] } = await admin.query("SELECT status FROM gestao.leads WHERE id=$1", [leadId]);
    assert.equal(lead.status, "aprovado");
    const { rows: trilha } = await admin.query(
      "SELECT ator_id,detalhes->>'anterior' AS anterior,detalhes->>'novo' AS novo FROM gestao.auditoria WHERE entidade='lead' AND entidade_id=$1 AND acao='alterar_status' ORDER BY criado_em,id",
      [leadId],
    );
    assert.equal(trilha.length, 4);
    assert.deepEqual(trilha.map(x => [x.anterior, x.novo]), [
      ["novo", "qualificado"],
      ["qualificado", "orcamento_em_preparo"],
      ["orcamento_em_preparo", "orcamento_enviado"],
      ["orcamento_enviado", "aprovado"],
    ]);
    assert.equal(trilha[0].ator_id, titular.id);
    assert.deepEqual(trilha.slice(1).map(x=>x.ator_id), Array(3).fill(comercial.id));

    // Revogar sessão e desativar conta: não pode sequer alterar outro lead novo.
    const { rows: [{ id: segundo }] } = await admin.query(
      "INSERT INTO gestao.leads(cliente_id,descricao) VALUES($1,$2) RETURNING id",
      [clienteId, "Verificação adicional de sessão"],
    );
    await admin.query("UPDATE gestao.sessoes SET revogada_em=clock_timestamp() WHERE usuario_id=$1", [titular.id]);
    const { rows: [r1] } = await app.query(
      "SELECT gestao.alterar_status_lead($1,$2::uuid,'novo','qualificado') AS permitido",
      [titular.token, segundo],
    );
    assert.equal(r1.permitido, false);
    await admin.query("UPDATE gestao.usuarios SET ativo=false WHERE id=$1", [comercial.id]);
    const { rows: [r2] } = await app.query(
      "SELECT gestao.alterar_status_lead($1,$2::uuid,'novo','qualificado') AS permitido",
      [comercial.token, segundo],
    );
    assert.equal(r2.permitido, false);
    await admin.query("DELETE FROM gestao.leads WHERE id=$1", [segundo]);
  } finally {
    if (leadId) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='lead' AND entidade_id=$1", [leadId]).catch(() => {});
      await admin.query("DELETE FROM gestao.leads WHERE id=$1", [leadId]).catch(() => {});
    }
    if (clienteId) await admin.query("DELETE FROM gestao.clientes WHERE id=$1", [clienteId]).catch(() => {});
    for (const id of sessoes) await admin.query("DELETE FROM gestao.sessoes WHERE id=$1", [id]).catch(() => {});
    for (const id of usuarios) {
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1", [id]).catch(() => {});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1", [id]).catch(() => {});
    }
    await app.end().catch(() => {});
    await admin.end().catch(() => {});
  }
});
