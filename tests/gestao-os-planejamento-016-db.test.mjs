import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import pg from "pg";

const adminUrl=process.env.GESTAO_TEST_DATABASE_URL;
const appUrl=process.env.GESTAO_TEST_APP_DATABASE_URL;
const sha=x=>createHash("sha256").update(x).digest("hex");
const token=()=>randomBytes(32).toString("base64url");

test("016 OS: admin planeja com tecnico ativo, data prevista, revisao e RBAC, sem executar",{
  skip:!adminUrl||!appUrl?"Somente PostgreSQL descartável do CI":false,
},async()=>{
  const nomeDb="gestao_os016_"+randomUUID().replaceAll("-","").slice(0,17);
  const root=new pg.Client({connectionString:adminUrl,connectionTimeoutMillis:5000});
  let db,app,app2;
  await root.connect();
  try{
    await root.query("CREATE DATABASE "+nomeDb);
    const aurl=new URL(adminUrl);aurl.pathname="/"+nomeDb;
    const burl=new URL(appUrl);burl.pathname="/"+nomeDb;
    db=new pg.Client({connectionString:aurl.toString(),connectionTimeoutMillis:5000});
    app=new pg.Client({connectionString:burl.toString(),connectionTimeoutMillis:5000});
    app2=new pg.Client({connectionString:burl.toString(),connectionTimeoutMillis:5000});
    await db.connect();
    await db.query("CREATE SCHEMA IF NOT EXISTS gestao; CREATE TABLE gestao.schema_migrations (versao text PRIMARY KEY,checksum text NOT NULL,aplicada_em timestamptz DEFAULT now())");
    const files=(await readdir("db/migrations")).filter(f=>/^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort();
    assert.equal(files.length,16,"release 016 de OS sem migration 016 de segundo fator");
    assert.equal(files.at(-1),"016_gestao_os_planejamento.sql");
    for(const file of files){
      const source=await readFile("db/migrations/"+file,"utf8");
      await db.query("BEGIN");
      try{
        await db.query(source);
        await db.query("INSERT INTO gestao.schema_migrations(versao,checksum) VALUES($1,$2)",[file,sha(source)]);
        await db.query("COMMIT");
      }catch(e){
        await db.query("ROLLBACK");
        throw new Error("Falha ao aplicar "+file,{cause:e});
      }
    }
    await db.query("GRANT USAGE ON SCHEMA gestao TO gestao_app");
    await Promise.all([app.connect(),app2.connect()]);

    const {rows:[grant]}=await db.query(
      "SELECT has_function_privilege('gestao_app','gestao.planejar_os_pendente_016(text,uuid,uuid,date,text,integer)','EXECUTE') AS app_planeja,has_function_privilege('gestao_convites','gestao.planejar_os_pendente_016(text,uuid,uuid,date,text,integer)','EXECUTE') AS convites_planejam,has_table_privilege('gestao_app','gestao.os_planejamento_016','INSERT') AS app_insere,has_table_privilege('gestao_app','gestao.os_planejamento_016','UPDATE') AS app_atualiza,has_table_privilege('gestao_app','gestao.ordens_servico','UPDATE') AS app_altera_os,has_table_privilege('gestao_app','gestao.recebimentos','INSERT') AS app_recebe");
    assert.deepEqual(grant,{app_planeja:true,convites_planejam:false,app_insere:false,app_atualiza:false,app_altera_os:false,app_recebe:false});

    const criarUsuario=async papel=>{
      const nome="qa_os_"+randomUUID().replaceAll("-","").slice(0,18);
      const {rows:[{id}]}=await db.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('Usuario QA OS',$1,'hash-qa') RETURNING id",[nome]);
      await db.query("INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",[id,papel]);
      const sessao=token();
      await db.query(
        "INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour')",
        [id,sha(sessao)]);
      return {id,sessao};
    };
    const admin=await criarUsuario("admin");
    const tecnico=await criarUsuario("tecnico");
    const outroTecnico=await criarUsuario("tecnico");
    const comercial=await criarUsuario("comercial");

    const {rows:[{id:cliente}]}=await db.query(
      "INSERT INTO gestao.clientes(nome) VALUES('Cliente QA planejamento') RETURNING id");
    const {rows:[{id:lead}]}=await db.query(
      "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,'Servico de teste','aprovado') RETURNING id",[cliente]);
    const {rows:[{id:orc}]}=await db.query(
      "INSERT INTO gestao.orcamentos(lead_id,status) VALUES($1,'aprovado') RETURNING id",[lead]);
    await db.query(
      "INSERT INTO gestao.orcamento_versoes(orcamento_id,versao,valor_centavos,descricao,validade_em,aprovado_em,aprovado_por) VALUES($1,1,47500,'Projeto de QA',now()+interval '7 days',now(),'Detentor do link privado')",[orc]);
    const {rows:[{id:os}]}=await db.query(
      "INSERT INTO gestao.ordens_servico(orcamento_id,versao_aprovada,status) VALUES($1,1,'pendente') RETURNING id",[orc]);
    const {rows:[{amanha}]}=await db.query(
      "SELECT ((clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date + 1)::text AS amanha");
    const {rows:[{passado}]}=await db.query(
      "SELECT ((clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date - 1)::text AS passado");

    const planejar=async(conn,sessao,tecnicoId=tecnico.id,dia=amanha,obs="",rev=0)=>(
      await conn.query("SELECT gestao.planejar_os_pendente_016($1,$2::uuid,$3::uuid,$4::date,$5,$6::integer) AS ok",
        [sessao,os,tecnicoId,dia,obs,rev])).rows[0].ok;

    assert.equal(await planejar(app,tecnico.sessao),false,"técnico não atribui serviço");
    assert.equal(await planejar(app,comercial.sessao),false,"comercial não atribui serviço");
    assert.equal(await planejar(app,token()),false,"sessão aleatória negada");
    assert.equal(await planejar(app,admin.sessao,tecnico.id,passado),false,"não aceita data passada");
    assert.equal(await planejar(app,admin.sessao,comercial.id),false,"comercial não pode ser responsável técnico");
    assert.equal(await planejar(app,admin.sessao,tecnico.id,amanha,"x".repeat(501)),false,"nota muito longa");
    assert.equal(await planejar(app,admin.sessao),true,"admin vincula técnico e previsão");
    assert.equal(await planejar(app,admin.sessao),false,"formulário antigo rev 0 não sobrescreve rev 1");

    const {rows:[res]}=await db.query("SELECT os.status,os.agendada_para,os.responsavel_id,pl.revisao,pl.tecnico_id,pl.data_prevista::text AS dia FROM gestao.ordens_servico os JOIN gestao.os_planejamento_016 pl ON pl.os_id=os.id WHERE os.id=$1",[os]);
    assert.deepEqual(res,{
      status:"pendente",agendada_para:null,responsavel_id:null,revisao:1,tecnico_id:tecnico.id,dia:amanha,
    },"planejamento não vira agendamento ou OS executável");

    assert.equal((await app.query("SELECT * FROM gestao.listar_tecnicos_os_016($1)",[admin.sessao])).rows.length,2);
    assert.deepEqual((await app.query("SELECT * FROM gestao.listar_tecnicos_os_016($1)",[tecnico.sessao])).rows,[]);
    assert.ok((await app.query("SELECT * FROM gestao.listar_os_planejamento_016($1)",[tecnico.sessao])).rows.some(x=>x.id===os&&x.revisao===1));
    assert.deepEqual((await app.query("SELECT * FROM gestao.listar_os_planejamento_016($1)",[comercial.sessao])).rows,[]);

    const concorrente=await Promise.all([
      planejar(app,admin.sessao,tecnico.id,amanha,"Planejamento A",1),
      planejar(app2,admin.sessao,outroTecnico.id,amanha,"Planejamento B",1),
    ]);
    assert.deepEqual(concorrente.sort(),[false,true],"somente uma revisão concorrente prevalece");
    assert.equal((await db.query("SELECT revisao FROM gestao.os_planejamento_016 WHERE os_id=$1",[os])).rows[0].revisao,2);
    assert.equal(await planejar(app,admin.sessao,tecnico.id,amanha,"Tentativa antiga",1),false);
    assert.equal((await db.query(
      "SELECT count(*)::int AS qtd FROM gestao.auditoria WHERE entidade='os' AND entidade_id=$1 AND acao='planejar_os_016'",[os])).rows[0].qtd,2);

    await db.query("UPDATE gestao.usuarios SET ativo=false WHERE id=$1",[tecnico.id]);
    assert.equal(await planejar(app,admin.sessao,tecnico.id,amanha,"",2),false,"técnico inativo não pode ser escolhido");
    await db.query("UPDATE gestao.ordens_servico SET status='agendada' WHERE id=$1",[os]);
    assert.equal(await planejar(app,admin.sessao,outroTecnico.id,amanha,"",2),false,
      "planejamento só edita OS pendente");

    const {rows:[financeiro]}=await db.query(
      "SELECT (SELECT count(*)::int FROM gestao.recebimentos WHERE os_id=$1) AS recebimentos,(SELECT count(*)::int FROM gestao.custos_servico WHERE os_id=$1) AS custos,(SELECT count(*)::int FROM gestao.lancamentos_financeiros WHERE os_id=$1) AS lancamentos",[os]);
    assert.deepEqual(financeiro,{recebimentos:0,custos:0,lancamentos:0});
    await assert.rejects(app.query("SELECT * FROM gestao.os_planejamento_016 LIMIT 1"),
      e=>e.code==="42501","sem leitura direta das notas da OS");
  }finally{
    await Promise.all([app?.end().catch(()=>{}),app2?.end().catch(()=>{}),db?.end().catch(()=>{})]);
    await root.query("DROP DATABASE IF EXISTS "+nomeDb+" WITH (FORCE)").catch(()=>{});
    await root.end();
  }
});
