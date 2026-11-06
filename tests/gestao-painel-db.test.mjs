import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  SQL_RESUMO_GESTAO,
  SQL_SOLICITACOES_RECENTES,
  rotuloStatusLead,
  rotuloOrigemLead,
} from "../src/lib/gestao/painel.ts";
import { SQL_CADASTRAR_LEAD } from "../src/lib/gestao/queries.ts";

test("rótulos refletem apenas os estados reais do fluxo comercial", () => {
  assert.equal(rotuloStatusLead("novo"), "Novo");
  assert.equal(rotuloStatusLead("qualificado"), "Qualificado");
  assert.equal(rotuloStatusLead("orcamento_em_preparo"), "Orçamento em preparo");
  assert.equal(rotuloStatusLead("orcamento_enviado"), "Orçamento enviado");
  assert.equal(rotuloStatusLead("aprovado"), "Aprovado");
  assert.equal(rotuloStatusLead("recusado"), "Recusado");
  assert.equal(rotuloStatusLead("perdido"), "Perdido");
  assert.equal(rotuloStatusLead("desconhecido"), "Outro status");
  assert.equal(rotuloOrigemLead("whatsapp"), "WhatsApp");
  assert.equal(rotuloOrigemLead("nao_informada"), "Não informada");
});

test("gestao_app consulta KPIs e solicitações sem grants novos ou dados de autenticação", {
  skip: !process.env.GESTAO_TEST_APP_DATABASE_URL && "Requer banco descartável do CI",
}, async () => {
  const db = new Client({
    connectionString: process.env.GESTAO_TEST_APP_DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();
  try {
    await db.query("BEGIN");
    const { rows: [antes] } = await db.query(SQL_RESUMO_GESTAO);
    assert.equal(typeof antes.clientes, "number");
    assert.equal(typeof antes.solicitacoes, "number");

    const nome = "Painel QA " + randomUUID();
    const { rows: [cadastro] } = await db.query(SQL_CADASTRAR_LEAD,
      [nome, null, "whatsapp", "Revisão de quadro elétrico"]);
    assert.ok(cadastro.id);

    const { rows: [depois] } = await db.query(SQL_RESUMO_GESTAO);
    assert.equal(depois.clientes, antes.clientes + 1);
    assert.equal(depois.solicitacoes, antes.solicitacoes + 1);
    assert.equal(depois.novas, antes.novas + 1);
    assert.equal(depois.qualificadas, antes.qualificadas);
    assert.equal(depois.em_orcamento, antes.em_orcamento);
    assert.equal(depois.aprovadas, antes.aprovadas);

    const { rows: recentes } = await db.query(SQL_SOLICITACOES_RECENTES);
    assert.ok(recentes.length <= 5);
    const lead = recentes.find(item => item.id === cadastro.id);
    assert.ok(lead, "pedido recente deve aparecer no dashboard");
    assert.equal(lead.nome, nome);
    assert.equal(lead.status, "novo");
    assert.equal(lead.origem, "whatsapp");
    assert.equal(lead.descricao, "Revisão de quadro elétrico");
    assert.deepEqual(Object.keys(lead).sort(),
      ["criado_em", "descricao", "id", "nome", "origem", "status"].sort(),
      "o painel não deve consultar telefone, senha ou token");
    await db.query("ROLLBACK");
  } finally {
    await db.query("ROLLBACK").catch(() => {});
    await db.end();
  }
});
