import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import {
  parseValorOrcamento, dataISOValida,
  formatarValorOrcamento, formatarValidadeOrcamento,
  valorOrcamentoParaEntrada, validadeOrcamentoParaEntrada,
} from "../src/lib/gestao/orcamentos.ts";

test("orçamento: centavos exatos, calendário válido e apresentação em reais", () => {
  assert.equal(parseValorOrcamento("350,50"), 35050n);
  assert.equal(parseValorOrcamento("350.5"), 35050n);
  assert.equal(parseValorOrcamento("0,01"), 1n);
  assert.equal(parseValorOrcamento("99999999,99"), 9999999999n);
  for (const invalido of ["0", "0,00", "1.000,00", "1,999", "1e3", "-100", "R$ 100", "999999999,00", "1;DROP TABLE"]) {
    assert.equal(parseValorOrcamento(invalido), null, invalido);
  }
  assert.equal(dataISOValida("2026-11-30"), true);
  assert.equal(dataISOValida("2026-02-29"), false);
  assert.equal(dataISOValida("2028-02-29"), true);
  assert.equal(dataISOValida("2026-13-01"), false);
  assert.match(formatarValorOrcamento("35050"), /350,50/);
  assert.match(formatarValidadeOrcamento("2026-11-07T03:00:00.000Z"), /06\/11\/2026/);
  assert.equal(valorOrcamentoParaEntrada("35000"), "350,00");
  assert.equal(valorOrcamentoParaEntrada("35050"), "350,50");
  assert.equal(valorOrcamentoParaEntrada("1"), "0,01");
  assert.equal(valorOrcamentoParaEntrada("NaN"), "");
  assert.equal(validadeOrcamentoParaEntrada("2026-11-07T03:00:00.000Z"), "2026-11-06");
});

test("orçamentos: sessão, papéis, isolamento SQL, criação única, versão e auditoria", {
  skip: !process.env.GESTAO_TEST_DATABASE_URL || !process.env.GESTAO_TEST_APP_DATABASE_URL
    ? "Requer PostgreSQL de CI descartável" : false,
}, async () => {
  const admin = new pg.Client({ connectionString: process.env.GESTAO_TEST_DATABASE_URL });
  const app = new pg.Client({ connectionString: process.env.GESTAO_TEST_APP_DATABASE_URL });
  await admin.connect();
  await app.connect();
  const ids = { usuarios: [], sessoes: [], orcamento: null, lead: null, cliente: null };
  try {
    const { rows: [grants] } = await admin.query(`
      SELECT
        has_function_privilege('gestao_app',
          'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE') AS criar,
        has_function_privilege('gestao_app',
          'gestao.listar_orcamentos_restritos(text)','EXECUTE') AS listar,
        has_function_privilege('gestao_convites',
          'gestao.criar_orcamento_rascunho(text,uuid,bigint,text,date)','EXECUTE') AS convites_criar,
        has_function_privilege('gestao_convites',
          'gestao.listar_orcamentos_restritos(text)','EXECUTE') AS convites_listar,
        has_table_privilege('gestao_app','gestao.orcamentos','INSERT') AS insert_direto,
        has_table_privilege('gestao_app','gestao.orcamentos','SELECT') AS select_direto,
        has_table_privilege('gestao_app','gestao.orcamento_versoes','SELECT') AS versoes_leitura,
        has_table_privilege('gestao_app','gestao.auditoria','INSERT') AS auditoria_direta
    `);
    assert.deepEqual(grants, {
      criar: true, listar: true, convites_criar: false, convites_listar: false,
      insert_direto: false, select_direto: false, versoes_leitura: false,
      auditoria_direta: false,
    });

    async function criarUsuario(papel) {
      const usuario = "qa_quote_" + randomUUID().replaceAll("-", "").slice(0, 18);
      const { rows: [{ id }] } = await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES($1,$2,$3) RETURNING id",
        ["Teste orçamento", usuario, "legacy-placeholder"],
      );
      ids.usuarios.push(id);
      await admin.query("INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",
        [id, papel]);
      const token = randomBytes(32).toString("base64url");
      const { rows: [{ id: sid }] } = await admin.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour') RETURNING id",
        [id, createHash("sha256").update(token).digest("hex")],
      );
      ids.sessoes.push(sid);
      return { id, token };
    }
    const adminUser = await criarUsuario("admin");
    const comercial = await criarUsuario("comercial");
    const tecnico = await criarUsuario("tecnico");
    const { rows: [{ id: cliente }] } = await admin.query(
      "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id", ["QA orçamento " + randomUUID()]);
    ids.cliente = cliente;
    const { rows: [{ id: lead }] } = await admin.query(
      "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,$2,'qualificado') RETURNING id",
      [cliente, "Orçamento teste de instalação elétrica"]);
    ids.lead = lead;
    const validade = new Date(Date.now() + 7*86400000).toISOString().slice(0,10);
    const criar = async (token, valor="35050", descricao="Instalação elétrica com materiais", data=validade) => {
      const { rows: [{ id }] } = await app.query(
        "SELECT gestao.criar_orcamento_rascunho($1,$2::uuid,$3::bigint,$4,$5::date) AS id",
        [token, lead, valor, descricao, data],
      );
      return id;
    };
    const listar = async token => (await app.query(
      "SELECT * FROM gestao.listar_orcamentos_restritos($1)", [token])).rows;
    assert.deepEqual(await listar(tecnico.token), []);
    assert.deepEqual(await listar(randomBytes(32).toString("base64url")), []);
    assert.equal(await criar(tecnico.token), null, "técnico não cria");
    assert.equal(await criar(randomBytes(32).toString("base64url")), null, "token inválido não cria");
    assert.equal(await criar(adminUser.token, "-1"), null, "valor inválido negado");
    assert.equal(await criar(adminUser.token, "35050", "Curta"), null, "descrição inválida negada");
    assert.equal(await criar(adminUser.token, "35050", "Instalação elétrica", "2099-12-31"), null,
      "validade excessiva negada");

    ids.orcamento = await criar(comercial.token);
    assert.ok(ids.orcamento, "comercial pode preparar orçamento");
    assert.equal(await criar(adminUser.token), null, "não duplica orçamento para o mesmo lead");

    const { rows: [orco] } = await admin.query(
      "SELECT o.status, o.versao_atual, v.valor_centavos, v.descricao, l.status AS lead_status FROM gestao.orcamentos o JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id AND v.versao=1 JOIN gestao.leads l ON l.id=o.lead_id WHERE o.id=$1",
      [ids.orcamento]);
    assert.equal(orco.status, "rascunho");
    assert.equal(orco.versao_atual, 1);
    assert.equal(orco.valor_centavos, "35050");
    assert.equal(orco.lead_status, "orcamento_em_preparo");
    const lista = await listar(adminUser.token);
    const atual = lista.find(o=>o.id===ids.orcamento);
    assert.ok(atual);
    assert.equal(atual.cliente_nome.startsWith("QA orçamento "), true);
    assert.equal(atual.valor_centavos,"35050");
    assert.equal(atual.versao,1);
    assert.deepEqual(Object.keys(atual).sort(),
      ["id","lead_id","cliente_nome","versao","status","valor_centavos","descricao","validade_em","criado_em"].sort(),
      "sem telefones, senhas ou tokens na listagem");

    const { rows: trilha } = await admin.query(
      "SELECT entidade,ator_id,acao,detalhes->>'lead_id' AS lead_id FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1",
      [ids.orcamento]);
    assert.equal(trilha.length,1);
    assert.equal(trilha[0].ator_id,comercial.id);
    assert.equal(trilha[0].acao,"criar_rascunho");
    assert.equal(trilha[0].lead_id,lead);

    await admin.query("UPDATE gestao.sessoes SET revogada_em=now() WHERE usuario_id=$1", [adminUser.id]);
    assert.deepEqual(await listar(adminUser.token),[],"sessão revogada não lista");
    await admin.query("UPDATE gestao.usuarios SET ativo=false WHERE id=$1", [comercial.id]);
    assert.deepEqual(await listar(comercial.token),[],"conta desativada não lista");
  } finally {
    if(ids.orcamento) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1",
        [ids.orcamento]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamento_versoes WHERE orcamento_id=$1",
        [ids.orcamento]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamentos WHERE id=$1", [ids.orcamento]).catch(()=>{});
    }
    if(ids.lead) await admin.query("DELETE FROM gestao.leads WHERE id=$1",[ids.lead]).catch(()=>{});
    if(ids.cliente) await admin.query("DELETE FROM gestao.clientes WHERE id=$1",[ids.cliente]).catch(()=>{});
    for(const id of ids.sessoes) await admin.query("DELETE FROM gestao.sessoes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.usuarios){
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1",[id]).catch(()=>{});
    }
    await app.end().catch(()=>{});
    await admin.end().catch(()=>{});
  }
});
