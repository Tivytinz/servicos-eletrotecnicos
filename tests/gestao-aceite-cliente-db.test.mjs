import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const adminUrl=process.env.GESTAO_TEST_DATABASE_URL;
const appUrl=process.env.GESTAO_TEST_APP_DATABASE_URL;
const sha=token=>createHash("sha256").update(token).digest("hex");
const segredo=()=>randomBytes(32).toString("base64url");

test("015: link de uso único, recusa, reemissão, RBAC, concorrência e OS apenas pendente",{
  skip:!adminUrl||!appUrl?"Somente com PostgreSQL descartável":false,
},async()=>{
  const admin=new pg.Client({connectionString:adminUrl});
  const app=new pg.Client({connectionString:appUrl});
  const app2=new pg.Client({connectionString:appUrl});
  const ids={usuarios:[],sessoes:[],clientes:[],leads:[],orcamentos:[],os:[]};
  await Promise.all([admin.connect(),app.connect(),app2.connect()]);
  try {
    const {rows:[perms]}=await admin.query(`
      SELECT
        has_function_privilege('gestao_app','gestao.emitir_link_aceite_cliente(text,uuid,integer,text)','EXECUTE') AS emitir,
        has_function_privilege('gestao_app','gestao.consultar_link_aceite_cliente(text)','EXECUTE') AS consultar,
        has_function_privilege('gestao_app','gestao.responder_link_aceite_cliente(text,text,boolean)','EXECUTE') AS responder,
        has_function_privilege('gestao_app','gestao.revogar_link_aceite_cliente(text,uuid,integer)','EXECUTE') AS revogar,
        has_function_privilege('gestao_convites','gestao.responder_link_aceite_cliente(text,text,boolean)','EXECUTE') AS convite,
        has_table_privilege('gestao_app','gestao.links_aceite_cliente','SELECT') AS tabela_select,
        has_table_privilege('gestao_app','gestao.links_aceite_cliente','INSERT') AS tabela_insert,
        has_table_privilege('gestao_app','gestao.orcamentos','UPDATE') AS orcamento_update,
        has_table_privilege('gestao_app','gestao.recebimentos','INSERT') AS recebimentos_insert
    `);
    assert.deepEqual(perms,{
      emitir:true,consultar:true,responder:true,revogar:true,
      convite:false,tabela_select:false,tabela_insert:false,
      orcamento_update:false,recebimentos_insert:false,
    });
    const usuario=async papel=>{
      const email="qa_aceite_"+randomUUID().replaceAll("-","").slice(0,20);
      const {rows:[{id}]}=await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES($1,$2,$3) RETURNING id",
        ["QA aceite",email,"hash-qa"]);
      ids.usuarios.push(id);
      await admin.query("INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",[id,papel]);
      const token=segredo();
      const {rows:[{id:sid}]}=await admin.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour') RETURNING id",
        [id,sha(token)]);
      ids.sessoes.push(sid);
      return {id,token,sid};
    };
    const comercial=await usuario("comercial"),tecnico=await usuario("tecnico"),adm=await usuario("admin");
    const validade=new Date(Date.now()+10*86400000).toISOString().slice(0,10);
    const orcamento=async (envio=true,evidencia="Envio registrado por WhatsApp para testes automatizados")=>{
      const {rows:[{id:cliente}]}=await admin.query(
        "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id",
        ["Cliente QA link "+randomUUID()]);
      ids.clientes.push(cliente);
      const {rows:[{id:lead}]}=await admin.query(
        "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,$2,'qualificado') RETURNING id",
        [cliente,"Serviço elétrico sintético para QA"]);
      ids.leads.push(lead);
      const {rows:[{id}]}=await app.query(
        "SELECT gestao.criar_orcamento_rascunho($1,$2::uuid,$3::bigint,$4,$5::date) AS id",
        [comercial.token,lead,"47500","Adequação elétrica de QA, com mão de obra e materiais",validade]);
      assert.ok(id);
      ids.orcamentos.push(id);
      if(envio){
        const {rows:[{ok}]}=await app.query(
          "SELECT gestao.registrar_evento_orcamento($1,$2::uuid,1,'envio','whatsapp',$3) AS ok",
          [comercial.token,id,evidencia]);
        assert.equal(ok,true);
      }
      return {id,lead};
    };
    const emitir=async (session,id,hash)=>(
      await app.query("SELECT gestao.emitir_link_aceite_cliente($1,$2::uuid,1,$3) AS id",
        [session,id,hash])).rows[0].id;
    const ver=async hash=>(await app.query(
      "SELECT * FROM gestao.consultar_link_aceite_cliente($1)",[hash])).rows;
    const responder=async (db,hash,decisao="aprovacao",leu=true)=>(
      await db.query("SELECT gestao.responder_link_aceite_cliente($1,$2,$3) AS ok",
        [hash,decisao,leu])).rows[0].ok;
    const revogar=async(session,id)=>(
      await app.query("SELECT gestao.revogar_link_aceite_cliente($1,$2::uuid,1) AS ok",
        [session,id])).rows[0].ok;

    const simples=await orcamento();
    const t1=segredo(),h1=sha(t1);
    assert.equal(await emitir(tecnico.token,simples.id,h1),null,"técnico não emite");
    assert.equal(await emitir(segredo(),simples.id,h1),null,"sessão inválida");
    assert.equal(await emitir(comercial.token,simples.id,"invalid"),null,"hash inválido");
    assert.ok(await emitir(comercial.token,simples.id,h1));
    assert.equal((await ver(h1))[0].valor_centavos,"47500");
    assert.equal((await ver(h1))[0].versao,1);
    assert.equal((await ver(sha(segredo()))).length,0);
    assert.equal(await responder(app,h1,"aprovacao",false),false,"exige confirmação explícita");
    assert.equal(await responder(app,h1,"qualquer",true),false);
    const t2=segredo(),h2=sha(t2);
    assert.ok(await emitir(adm.token,simples.id,h2),"reemissão autorizada");
    assert.deepEqual(await ver(h1),[],"link anterior revogado");
    assert.equal(await responder(app,h1),false);
    assert.equal(await revogar(comercial.token,simples.id),true);
    assert.deepEqual(await ver(h2),[],"link revogado não abre");
    assert.equal(await responder(app,h2),false);

    const token3=segredo(),h3=sha(token3);
    assert.ok(await emitir(comercial.token,simples.id,h3));
    const concurrent=await Promise.all([
      responder(app,h3,"aprovacao"),responder(app2,h3,"aprovacao"),
    ]);
    assert.deepEqual(concurrent.sort(),[false,true],"apenas uma resposta concorrente");
    assert.deepEqual(await ver(h3),[],"link utilizado não revela orçamento");
    assert.equal(await responder(app,h3,"recusa"),false,"não permite sobrescrever aceite");
    const {rows:[estado]}=await admin.query(
      "SELECT o.status,l.status AS lead_status,v.aprovado_por FROM gestao.orcamentos o JOIN gestao.leads l ON l.id=o.lead_id JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id AND v.versao=1 WHERE o.id=$1",[simples.id]);
    assert.deepEqual([estado.status,estado.lead_status],["aprovado","aprovado"]);
    assert.match(estado.aprovado_por,/identidade não verificada/);
    assert.equal(await emitir(comercial.token,simples.id,sha(segredo())),null,"aceite é terminal");

    const candidatas=(token)=>app.query("SELECT * FROM gestao.listar_candidatas_os_preparacao_restritas($1)",[token]);
    assert.ok((await candidatas(tecnico.token)).rows.some(x=>x.orcamento_id===simples.id),
      "aprovação por link permite OS somente em preparação");
    const {rows:[{id:os}]}=await app.query(
      "SELECT gestao.criar_os_preparacao($1,$2::uuid,1) AS id",
      [tecnico.token,simples.id]);
    assert.ok(os);
    ids.os.push(os);
    const {rows:[rowOs]}=await admin.query(
      "SELECT status,agendada_para FROM gestao.ordens_servico WHERE id=$1",[os]);
    assert.equal(rowOs.status,"pendente");
    assert.equal(rowOs.agendada_para,null);
    assert.equal(await app.query("SELECT count(*)::int AS n FROM gestao.listar_os_preparacao_restritas($1)",[tecnico.token]).then(x=>x.rows[0].n)>0,true);

    const recusa=await orcamento();
    const hr=sha(segredo());
    assert.ok(await emitir(comercial.token,recusa.id,hr));
    assert.equal(await responder(app,hr,"recusa"),true);
    const {rows:[recusado]}=await admin.query(
      "SELECT status FROM gestao.orcamentos WHERE id=$1",[recusa.id]);
    assert.equal(recusado.status,"recusado");
    assert.ok(!(await candidatas(adm.token)).rows.some(x=>x.orcamento_id===recusa.id));
    assert.equal(await responder(app,hr),false);

    const simulado=await orcamento(true,"TESTE INTERNO — simulação de envio sem cliente");
    assert.equal(await emitir(comercial.token,simulado.id,sha(segredo())),null,
      "link bloqueado para envio marcado como teste interno");

    const naoEnviado=await orcamento(false);
    assert.equal(await emitir(comercial.token,naoEnviado.id,sha(segredo())),null,
      "rascunho não gera link");
    const vence=await orcamento();
    const hv=sha(segredo());
    assert.ok(await emitir(comercial.token,vence.id,hv));
    await admin.query("UPDATE gestao.links_aceite_cliente SET emitido_em=now()-interval '48 hours', expira_em=now()-interval '24 hours' WHERE token_hash=$1",[hv]);
    assert.deepEqual(await ver(hv),[]);
    assert.equal(await responder(app,hv),false,"link expirado é rejeitado");

    const {rows:historico}=await app.query(
      "SELECT * FROM gestao.listar_links_aceite_cliente_restritos($1)",[comercial.token]);
    assert.ok(historico.some(x=>x.orcamento_id===simples.id&&x.resposta==="aprovacao"));
    assert.ok(historico.every(x=>!("token_hash" in x)),"hash não exposto na listagem");
    assert.deepEqual((await app.query("SELECT * FROM gestao.listar_links_aceite_cliente_restritos($1)",[tecnico.token])).rows,[]);
    await assert.rejects(app.query("SELECT * FROM gestao.links_aceite_cliente LIMIT 1"),
      e=>e.code==="42501","tabela de segredos sem SELECT direto");
    const {rows:[financeiro]}=await admin.query(
      "SELECT (SELECT count(*)::int FROM gestao.recebimentos WHERE os_id=$1) AS recebimentos, (SELECT count(*)::int FROM gestao.custos_servico WHERE os_id=$1) AS custos",[os]);
    assert.deepEqual(financeiro,{recebimentos:0,custos:0},"sem lançamentos financeiros");
  } finally {
    for(const os of ids.os) {
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='os' AND entidade_id=$1",[os]).catch(()=>{});
      await admin.query("DELETE FROM gestao.os_eventos WHERE os_id=$1",[os]).catch(()=>{});
      await admin.query("DELETE FROM gestao.ordens_servico WHERE id=$1",[os]).catch(()=>{});
    }
    for(const id of ids.orcamentos){
      await admin.query("DELETE FROM gestao.links_aceite_cliente WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamento_eventos WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamento_versoes WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamentos WHERE id=$1",[id]).catch(()=>{});
    }
    for(const id of ids.leads){
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='lead' AND entidade_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.leads WHERE id=$1",[id]).catch(()=>{});
    }
    for(const id of ids.clientes) await admin.query("DELETE FROM gestao.clientes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.sessoes) await admin.query("DELETE FROM gestao.sessoes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.usuarios){
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1",[id]).catch(()=>{});
    }
    await Promise.all([admin.end(),app.end(),app2.end()]);
  }
});
