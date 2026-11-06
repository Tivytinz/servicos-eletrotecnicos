import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("013: envio e decisão informados, versão, RBAC, auditoria e concorrência", {
  skip: !adminUrl || !appUrl ? "Requer PostgreSQL de CI descartável" : false,
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl });
  const app = new pg.Client({ connectionString: appUrl });
  const app2 = new pg.Client({ connectionString: appUrl });
  const ids = { usuarios: [], sessoes: [], clientes: [], leads: [], orcamentos: [] };
  await Promise.all([admin.connect(), app.connect(), app2.connect()]);
  try {
    const {rows:[grants]} = await admin.query(`
      SELECT
        has_function_privilege('gestao_app','gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)','EXECUTE') AS app_evento,
        has_function_privilege('gestao_app','gestao.listar_eventos_orcamento_restritos(text)','EXECUTE') AS app_lista,
        has_function_privilege('gestao_convites','gestao.registrar_evento_orcamento(text,uuid,integer,text,text,text)','EXECUTE') AS convites_evento,
        has_function_privilege('gestao_convites','gestao.listar_eventos_orcamento_restritos(text)','EXECUTE') AS convites_lista,
        has_table_privilege('gestao_app','gestao.orcamento_eventos','INSERT') AS insert_direto,
        has_table_privilege('gestao_app','gestao.orcamento_eventos','SELECT') AS select_direto,
        has_table_privilege('gestao_app','gestao.orcamentos','UPDATE') AS update_direto
    `);
    assert.deepEqual(grants, {
      app_evento:true,app_lista:true,convites_evento:false,convites_lista:false,
      insert_direto:false,select_direto:false,update_direto:false,
    });

    async function usuario(papel) {
      const nome="qa_evt_"+randomUUID().replaceAll("-","").slice(0,20);
      const {rows:[{id}]}=await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES($1,$2,$3) RETURNING id",
        ["QA orçamento",nome,"hash-qa"]);
      ids.usuarios.push(id);
      await admin.query("INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",[id,papel]);
      const token=randomBytes(32).toString("base64url");
      const {rows:[{id:sid}]}=await admin.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour') RETURNING id",
        [id,createHash("sha256").update(token).digest("hex")]);
      ids.sessoes.push(sid);
      return {id,token};
    }
    const comercial=await usuario("comercial"),tecnico=await usuario("tecnico"),adm=await usuario("admin");
    const validade=new Date(Date.now()+10*86400000).toISOString().slice(0,10);
    async function orcamento() {
      const {rows:[{id:cliente}]}=await admin.query(
        "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id",["Cliente QA evento "+randomUUID()]);
      ids.clientes.push(cliente);
      const {rows:[{id:lead}]}=await admin.query(
        "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,$2,'qualificado') RETURNING id",
        [cliente,"Instalação elétrica fictícia - QA"]);
      ids.leads.push(lead);
      const {rows:[{id}]}=await app.query(
        "SELECT gestao.criar_orcamento_rascunho($1,$2::uuid,$3::bigint,$4,$5::date) AS id",
        [comercial.token,lead,"35000","Instalação elétrica com materiais",validade]);
      assert.ok(id);
      ids.orcamentos.push(id);
      return {id,lead};
    }
    const evento=async (client,token,id,versao,tipo,canal="whatsapp",
      evidencia="Registro interno de mensagem informada pelo cliente")=>{
      const {rows:[{ok}]}=await client.query(
        "SELECT gestao.registrar_evento_orcamento($1,$2::uuid,$3::integer,$4,$5,$6) AS ok",
        [token,id,versao,tipo,canal,evidencia]);
      return ok;
    };
    const a=await orcamento();
    const alterar=async (token,lead,esperado,proximo)=>(
      await app.query("SELECT gestao.alterar_status_lead($1,$2::uuid,$3,$4) AS ok",
        [token,lead,esperado,proximo])).rows[0].ok;

    assert.equal(await alterar(comercial.token,a.lead,"orcamento_em_preparo","orcamento_enviado"),
      false,"status do orçamento não pode ser adiantado manualmente");
    assert.equal(await evento(app,comercial.token,a.id,1,"aprovacao"),false,"não aprova sem envio");
    assert.equal(await evento(app,tecnico.token,a.id,1,"envio"),false,"técnico bloqueado");
    assert.equal(await evento(app,randomBytes(32).toString("base64url"),a.id,1,"envio"),false);
    assert.equal(await evento(app,comercial.token,a.id,1,"envio","whatsapp","curta"),false);
    assert.equal(await evento(app,comercial.token,a.id,2,"envio"),false,"versão incorreta");
    assert.equal(await evento(app,comercial.token,a.id,1,"envio"),true,"envio relatado");
    assert.equal(await evento(app,comercial.token,a.id,1,"envio"),false,"envio duplicado");
    assert.equal(await alterar(comercial.token,a.lead,"orcamento_enviado","aprovado"),
      false,"aprovação requer evento correspondente");

    assert.equal(await evento(app,adm.token,a.id,1,"aprovacao","telefone",
      "Cliente declarou aprovação por telefone, referência atendimento QA"),true);
    assert.equal(await evento(app,adm.token,a.id,1,"recusa"),false,"decisão terminal imutável");

    const {rows:[estado]}=await admin.query(`
      SELECT o.status,l.status AS lead_status,v.aprovado_em,v.aprovado_por
      FROM gestao.orcamentos o JOIN gestao.leads l ON l.id=o.lead_id
      JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id AND v.versao=o.versao_atual
      WHERE o.id=$1`,[a.id]);
    assert.equal(estado.status,"aprovado");
    assert.equal(estado.lead_status,"aprovado");
    assert.ok(estado.aprovado_em);
    assert.match(estado.aprovado_por,/registrada internamente/i);
    const {rows:[quantidades]}=await admin.query(
      "SELECT (SELECT count(*)::int FROM gestao.ordens_servico WHERE orcamento_id=$1) AS os, (SELECT count(*)::int FROM gestao.recebimentos) AS recebimentos_todos",
      [a.id]);
    assert.equal(quantidades.os,0,"não cria OS");
    assert.ok(Number.isInteger(quantidades.recebimentos_todos),"apenas leitura, não cria receita");

    const b=await orcamento();
    assert.equal(await evento(app,comercial.token,b.id,1,"envio"),true);
    const decisao=await Promise.all([
      evento(app,comercial.token,b.id,1,"aprovacao"),
      evento(app2,adm.token,b.id,1,"recusa"),
    ]);
    assert.equal(decisao.filter(Boolean).length,1,"decisões simultâneas: só uma vence");
    const {rows:[bEstado]}=await admin.query(
      "SELECT status FROM gestao.orcamentos WHERE id=$1",[b.id]);
    assert.ok(["aprovado","recusado"].includes(bEstado.status));
    const {rows:[q]}=await admin.query(
      "SELECT count(*)::int AS n FROM gestao.orcamento_eventos WHERE orcamento_id=$1 AND tipo IN ('aprovacao','recusa')",
      [b.id]);
    assert.equal(q.n,1);

    const lista=async token=>(await app.query(
      "SELECT * FROM gestao.listar_eventos_orcamento_restritos($1)",[token])).rows;
    assert.deepEqual(await lista(tecnico.token),[],"técnico não vê evidências");
    assert.deepEqual(await lista(randomBytes(32).toString("base64url")),[],"sem sessão não lê");
    const eventos=await lista(comercial.token);
    assert.equal(eventos.filter(e=>e.orcamento_id===a.id).length,2);
    const {rows:auditoria}=await admin.query(
      "SELECT acao FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1 AND acao LIKE 'registrar_%'",
      [a.id]);
    assert.deepEqual(auditoria.map(x=>x.acao).sort(),["registrar_aprovacao","registrar_envio"]);
    await assert.rejects(app.query("SELECT * FROM gestao.orcamento_eventos LIMIT 1"),
      e=>e.code==="42501","tabela não pode ser lida diretamente pela aplicação");
  } finally {
    for (const id of ids.orcamentos) {
      await admin.query("DELETE FROM gestao.orcamento_eventos WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamento_versoes WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamentos WHERE id=$1",[id]).catch(()=>{});
    }
    for(const id of ids.leads) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='lead' AND entidade_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.leads WHERE id=$1",[id]).catch(()=>{});
    }
    for(const id of ids.clientes) await admin.query("DELETE FROM gestao.clientes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.sessoes) await admin.query("DELETE FROM gestao.sessoes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.usuarios) {
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1",[id]).catch(()=>{});
    }
    await Promise.all([admin.end(),app.end(),app2.end()]);
  }
});
