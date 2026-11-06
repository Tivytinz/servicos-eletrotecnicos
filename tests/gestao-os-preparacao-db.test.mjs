import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import pg from "pg";

const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;

test("014: OS pendente é restrita, impede simulações e nunca libera execução/financeiro", {
  skip: !adminUrl || !appUrl ? "Requer PostgreSQL descartável do CI" : false,
}, async () => {
  const admin = new pg.Client({ connectionString: adminUrl });
  const app = new pg.Client({ connectionString: appUrl });
  const app2 = new pg.Client({ connectionString: appUrl });
  const ids = { usuarios: [], sessoes: [], clientes: [], leads: [], orcamentos: [], os: [] };
  await Promise.all([admin.connect(), app.connect(), app2.connect()]);
  try {
    const {rows:[permissoes]} = await admin.query(`
      SELECT
        has_function_privilege('gestao_app',
          'gestao.criar_os_preparacao(text,uuid,integer)','EXECUTE') AS app_prepara,
        has_function_privilege('gestao_app',
          'gestao.listar_candidatas_os_preparacao_restritas(text)','EXECUTE') AS app_candidatas,
        has_function_privilege('gestao_app',
          'gestao.listar_os_preparacao_restritas(text)','EXECUTE') AS app_lista,
        has_function_privilege('gestao_convites',
          'gestao.criar_os_preparacao(text,uuid,integer)','EXECUTE') AS convite_prepara,
        has_table_privilege('gestao_app','gestao.ordens_servico','INSERT') AS insert_os,
        has_table_privilege('gestao_app','gestao.ordens_servico','UPDATE') AS update_os,
        has_table_privilege('gestao_app','gestao.os_eventos','INSERT') AS insert_eventos,
        has_table_privilege('gestao_app','gestao.recebimentos','INSERT') AS insert_recebimento
    `);
    assert.deepEqual(permissoes,{
      app_prepara:true,app_candidatas:true,app_lista:true,convite_prepara:false,
      insert_os:false,update_os:false,insert_eventos:false,insert_recebimento:false,
    });

    async function usuario(papel) {
      const nome = "qa_os_" + randomUUID().replaceAll("-","").slice(0,17);
      const {rows:[{id}]} = await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES($1,$2,$3) RETURNING id",
        ["QA OS",nome,"hash-qa"]);
      ids.usuarios.push(id);
      await admin.query("INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",[id,papel]);
      const token=randomBytes(32).toString("base64url");
      const {rows:[{id:sessao}]}=await admin.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour') RETURNING id",
        [id,createHash("sha256").update(token).digest("hex")]);
      ids.sessoes.push(sessao);
      return {id,token,sessao};
    }
    const adminUser=await usuario("admin");
    const tecnico=await usuario("tecnico");
    const comercial=await usuario("comercial");
    const validade=new Date(Date.now()+10*86400000).toISOString().slice(0,10);

    async function orcamento(aprovar,simular=false) {
      const {rows:[{id:cliente}]}=await admin.query(
        "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id",
        ["QA OS "+randomUUID()]);
      ids.clientes.push(cliente);
      const {rows:[{id:lead}]}=await admin.query(
        "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,$2,'qualificado') RETURNING id",
        [cliente,"Instalação elétrica teste de integração QA"]);
      ids.leads.push(lead);
      const {rows:[{id}]}=await app.query(
        "SELECT gestao.criar_orcamento_rascunho($1,$2::uuid,$3::bigint,$4,$5::date) AS id",
        [comercial.token,lead,"47500","Serviço técnico com materiais previstos",validade]);
      assert.ok(id);
      ids.orcamentos.push(id);
      if(aprovar){
        const envio=await app.query(
          "SELECT gestao.registrar_evento_orcamento($1,$2::uuid,1,'envio','whatsapp',$3) AS ok",
          [comercial.token,id,simular?"TESTE INTERNO — simulação de envio":"Mensagem enviada com confirmação identificada"]);
        assert.equal(envio.rows[0].ok,true);
        const aceite=await app.query(
          "SELECT gestao.registrar_evento_orcamento($1,$2::uuid,1,'aprovacao','whatsapp',$3) AS ok",
          [comercial.token,id,simular?"TESTE INTERNO — simulação de aprovação":"Resposta de aprovação relatada por operador"]);
        assert.equal(aceite.rows[0].ok,true);
      }
      return id;
    }

    const real=await orcamento(true);
    const simulada=await orcamento(true,true);
    const rascunho=await orcamento(false);
    async function criar(client,token,id,versao=1) {
      const {rows:[{id:osId}]}=await client.query(
        "SELECT gestao.criar_os_preparacao($1,$2::uuid,$3::integer) AS id",
        [token,id,versao]);
      return osId;
    }
    const candidatas=(token)=>app.query(
      "SELECT * FROM gestao.listar_candidatas_os_preparacao_restritas($1)",[token]);
    assert.ok((await candidatas(tecnico.token)).rows.some(x=>x.orcamento_id===real));
    assert.ok(!(await candidatas(tecnico.token)).rows.some(x=>x.orcamento_id===simulada));
    assert.ok(!(await candidatas(tecnico.token)).rows.some(x=>x.orcamento_id===rascunho));
    assert.equal((await candidatas(comercial.token)).rows.length,0);
    assert.equal(await criar(app,comercial.token,real),null,"comercial não gere OS");
    assert.equal(await criar(app,randomBytes(32).toString("base64url"),real),null);
    assert.equal(await criar(app,tecnico.token,real,2),null,"versão diferente");
    assert.equal(await criar(app,tecnico.token,rascunho),null,"rascunho sem aceite");
    assert.equal(await criar(app,tecnico.token,simulada),null,"aprovação de teste");
    const osId=await criar(app,tecnico.token,real);
    assert.ok(osId,"técnico pode preparar OS pendente");
    ids.os.push(osId);
    assert.equal(await criar(app2,adminUser.token,real),null,"sem duplicidade");
    const {rows:[os]}=await admin.query(
      "SELECT status,agendada_para,responsavel_id FROM gestao.ordens_servico WHERE id=$1",
      [osId]);
    assert.deepEqual(os,{status:"pendente",agendada_para:null,responsavel_id:null});
    const {rows:[evento]}=await admin.query(
      "SELECT status_anterior,status_novo,ator_id FROM gestao.os_eventos WHERE os_id=$1",[osId]);
    assert.deepEqual(evento,{status_anterior:null,status_novo:"pendente",ator_id:tecnico.id});
    const {rows:[auditoria]}=await admin.query(
      "SELECT detalhes FROM gestao.auditoria WHERE entidade='os' AND entidade_id=$1",[osId]);
    assert.equal(auditoria.detalhes.aceite_verificado,false);
    const {rows:listagem}=await app.query(
      "SELECT * FROM gestao.listar_os_preparacao_restritas($1)",[adminUser.token]);
    assert.ok(listagem.some(os=>os.id===osId && os.status==="pendente"));
    const {rows:listagemComercial}=await app.query(
      "SELECT * FROM gestao.listar_os_preparacao_restritas($1)",[comercial.token]);
    assert.deepEqual(listagemComercial,[]);
    assert.ok(!(await candidatas(adminUser.token)).rows.some(x=>x.orcamento_id===real));

    const {rows:[financeiro]}=await admin.query(
      "SELECT (SELECT count(*)::int FROM gestao.recebimentos WHERE os_id=$1) AS recebimentos, (SELECT count(*)::int FROM gestao.custos_servico WHERE os_id=$1) AS custos, (SELECT count(*)::int FROM gestao.lancamentos_financeiros WHERE os_id=$1) AS lancamentos",[osId]);
    assert.deepEqual(financeiro,{recebimentos:0,custos:0,lancamentos:0});
    await admin.query("UPDATE gestao.sessoes SET revogada_em=now() WHERE id=$1",[tecnico.sessao]);
    assert.equal(await criar(app,tecnico.token,rascunho),null,"sessão revogada");
    assert.deepEqual((await candidatas(tecnico.token)).rows,[]);
  } finally {
    for(const osId of ids.os){
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='os' AND entidade_id=$1",[osId]).catch(()=>{});
      await admin.query("DELETE FROM gestao.os_eventos WHERE os_id=$1",[osId]).catch(()=>{});
      await admin.query("DELETE FROM gestao.ordens_servico WHERE id=$1",[osId]).catch(()=>{});
    }
    for(const id of ids.orcamentos){
      await admin.query("DELETE FROM gestao.auditoria WHERE entidade='orcamento' AND entidade_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamento_eventos WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamento_versoes WHERE orcamento_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.orcamentos WHERE id=$1",[id]).catch(()=>{});
    }
    for(const id of ids.leads) await admin.query("DELETE FROM gestao.leads WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.clientes) await admin.query("DELETE FROM gestao.clientes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.sessoes) await admin.query("DELETE FROM gestao.sessoes WHERE id=$1",[id]).catch(()=>{});
    for(const id of ids.usuarios){
      await admin.query("DELETE FROM gestao.usuarios_papeis WHERE usuario_id=$1",[id]).catch(()=>{});
      await admin.query("DELETE FROM gestao.usuarios WHERE id=$1",[id]).catch(()=>{});
    }
    await Promise.all([admin.end().catch(()=>{}),app.end().catch(()=>{}),app2.end().catch(()=>{})]);
  }
});
