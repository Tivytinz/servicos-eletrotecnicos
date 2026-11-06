import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import pg from "pg";

// Apenas PostgreSQL DESCARTÁVEL: cada execução cria e elimina banco próprio.
// Nenhuma URL Railway ou credencial do usuário entra neste teste.
const adminUrl = process.env.GESTAO_TEST_DATABASE_URL;
const appUrl = process.env.GESTAO_TEST_APP_DATABASE_URL;
const sha = x => createHash("sha256").update(x).digest("hex");
const segredo = () => randomBytes(32).toString("base64url");
const codigo = () => randomBytes(12).toString("base64url");

test("016-B: política OFF, canal vinculado, OTP, limite e aceite transacional isolado", {
  skip: !adminUrl || !appUrl ? "Somente PostgreSQL descartável de CI" : false,
}, async () => {
  const dbName = "gestao_016_" + randomUUID().replaceAll("-", "").slice(0, 20);
  const root = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let admin, app, app2;
  await root.connect();
  try {
    await root.query("CREATE DATABASE " + dbName);
    const uri = new URL(adminUrl); uri.pathname = "/" + dbName;
    const appUri = new URL(appUrl); appUri.pathname = "/" + dbName;
    admin = new pg.Client({ connectionString: uri.toString(), connectionTimeoutMillis: 5000 });
    app = new pg.Client({ connectionString: appUri.toString(), connectionTimeoutMillis: 5000 });
    app2 = new pg.Client({ connectionString: appUri.toString(), connectionTimeoutMillis: 5000 });
    await admin.connect();
    await admin.query(
      "CREATE SCHEMA IF NOT EXISTS gestao; CREATE TABLE gestao.schema_migrations (versao text PRIMARY KEY, checksum text NOT NULL, aplicada_em timestamptz DEFAULT now())",
    );
    const files = (await readdir("db/migrations")).filter(n => /^\\d{3}_[a-z0-9_]+\\.sql$/.test(n)).sort();
    assert.equal(files.length, 16, "o teste requer precisamente migrations 001–016");
    for (const name of files) {
      const sql = await readFile("db/migrations/" + name, "utf8");
      await admin.query("BEGIN");
      try {
        await admin.query(sql);
        await admin.query("INSERT INTO gestao.schema_migrations(versao,checksum) VALUES($1,$2)", [name,sha(sql)]);
        await admin.query("COMMIT");
      } catch (err) {
        await admin.query("ROLLBACK");
        throw new Error("Falha ao aplicar " + name, {cause:err});
      }
    }
    await admin.query("GRANT CONNECT ON DATABASE " + dbName + " TO gestao_app");
    await admin.query("GRANT USAGE ON SCHEMA gestao TO gestao_app");
    await Promise.all([app.connect(),app2.connect()]);

    const { rows:[politica] } = await admin.query("SELECT obrigatorio FROM gestao.politica_canal_016 WHERE chave=true");
    assert.equal(politica.obrigatorio,false,"OFF por padrão");
    const {rows:[permissoes]} = await admin.query(`
      SELECT
        has_function_privilege('gestao_app','gestao.emitir_desafio_canal_016(text,uuid,integer,uuid,text)','EXECUTE') AS emite,
        has_function_privilege('gestao_app','gestao.responder_link_desafio_016(text,text,text,boolean)','EXECUTE') AS responde,
        has_function_privilege('gestao_convites','gestao.responder_link_desafio_016(text,text,text,boolean)','EXECUTE') AS convite_responde,
        has_table_privilege('gestao_app','gestao.desafios_canal_016','SELECT') AS le_codigo,
        has_table_privilege('gestao_app','gestao.desafios_canal_016','UPDATE') AS muda_codigo,
        has_table_privilege('gestao_app','gestao.canais_vinculados_016','UPDATE') AS altera_canal,
        has_table_privilege('gestao_app','gestao.politica_canal_016','UPDATE') AS ativa_politica
    `);
    assert.deepEqual(permissoes,{
      emite:true,responde:true,convite_responde:false,le_codigo:false,
      muda_codigo:false,altera_canal:false,ativa_politica:false,
    });

    const criarUsuario = async papel => {
      const usuario="qa016_"+randomUUID().replaceAll("-","").slice(0,20);
      const {rows:[{id}]}=await admin.query(
        "INSERT INTO gestao.usuarios(nome,usuario,senha_hash) VALUES('QA 016', $1, 'hash-descartavel') RETURNING id",
        [usuario],
      );
      await admin.query("INSERT INTO gestao.usuarios_papeis(usuario_id,papel_codigo) VALUES($1,$2)",[id,papel]);
      const token=segredo();
      await admin.query("INSERT INTO gestao.sessoes(usuario_id,token_hash,expira_em) VALUES($1,$2,now()+interval '1 hour')",[id,sha(token)]);
      return {id,token};
    };
    const adm=await criarUsuario("admin");
    const tecnico=await criarUsuario("tecnico");

    const criarProposta = async () => {
      const {rows:[{id:cliente}]}=await admin.query(
        "INSERT INTO gestao.clientes(nome) VALUES($1) RETURNING id",
        ["Cliente sintético QA 016 " + randomUUID()],
      );
      const {rows:[{id:lead}]}=await admin.query(
        "INSERT INTO gestao.leads(cliente_id,descricao,status) VALUES($1,'Teste banco descartável','orcamento_enviado') RETURNING id",[cliente]);
      const {rows:[{id:orcamento}]}=await admin.query(
        "INSERT INTO gestao.orcamentos(lead_id,status) VALUES($1,'enviado') RETURNING id",[lead]);
      await admin.query(
        "INSERT INTO gestao.orcamento_versoes(orcamento_id,versao,valor_centavos,descricao,validade_em) VALUES($1,1,47500,'Proposta sintética',now()+interval '8 days')",[orcamento]);
      await admin.query(
        "INSERT INTO gestao.orcamento_eventos(orcamento_id,versao,tipo,canal,evidencia,ator_id) VALUES($1,1,'envio','whatsapp','Envio sintético de QA 016, sem contato real',$2)",[orcamento,adm.id]);
      const token=segredo();
      const linkHash=sha(token);
      const {rows:[link]}=await app.query(
        "SELECT gestao.emitir_link_aceite_cliente($1,$2::uuid,1,$3) AS id",
        [adm.token,orcamento,linkHash]);
      assert.ok(link.id,"link 015 só para proposta válida");
      const vinculo=async (verificado=true, clienteAlvo=cliente)=>{
        const {rows:[c]}=await admin.query(
          `INSERT INTO gestao.canais_vinculados_016
            (cliente_id,tipo,destino_hash,verificado_em,verificado_por,metodo_vinculacao)
           VALUES ($1,'whatsapp',$2,$3,$4,$5) RETURNING id`,
          [clienteAlvo,sha("destino-ficticio-"+randomUUID()),
            verificado?new Date():null,verificado?adm.id:null,
            verificado?"prova_independente_documentada":null]);
        return c.id;
      };
      return {cliente,lead,orcamento,linkHash,linkId:link.id,vinculo};
    };
    const emitir = async (sessao,orcamento,canal,hash) => (
      await app.query("SELECT gestao.emitir_desafio_canal_016($1,$2::uuid,1,$3::uuid,$4) AS id",
        [sessao,orcamento,canal,hash])).rows[0].id;
    const responder = async (db,link,codigoHash,resposta="aprovacao",leu=true) => (
      await db.query("SELECT gestao.responder_link_desafio_016($1,$2,$3,$4) AS ok",
        [link,codigoHash,resposta,leu])).rows[0].ok;

    const legado=await criarProposta();
    assert.equal(await responder(app,legado.linkHash,sha(codigo())),false,"016 OFF não aceita desafio");
    assert.equal(await emitir(adm.token,legado.orcamento,await legado.vinculo(true),sha(codigo())),null,
      "016 OFF não deve emitir desafios");
    assert.equal((await app.query(
      "SELECT gestao.responder_link_aceite_cliente($1,'aprovacao',true) AS ok",[legado.linkHash]
    )).rows[0].ok,true,"015 deve funcionar integralmente enquanto 016 está OFF");

    await admin.query("UPDATE gestao.politica_canal_016 SET obrigatorio=true WHERE chave=true");
    const quote=await criarProposta();
    const pendente=await quote.vinculo(false);
    const terceiro=await criarProposta();
    const outroCliente=await terceiro.vinculo(true);
    const canal=await quote.vinculo(true);
    const c1=codigo(),h1=sha(c1);
    assert.equal((await app.query(
      "SELECT gestao.responder_link_aceite_cliente($1,'aprovacao',true) AS ok",[quote.linkHash]
    )).rows[0].ok,false,"bypass 015 bloqueado pelo PostgreSQL");
    assert.equal(await emitir(tecnico.token,quote.orcamento,canal,h1),null,"técnico não emite");
    assert.equal(await emitir(adm.token,quote.orcamento,pendente,h1),null,"contato só informado não é vínculo");
    assert.equal(await emitir(adm.token,quote.orcamento,outroCliente,h1),null,"canal de outro cliente negado");
    assert.equal(await emitir(adm.token,quote.orcamento,canal,"incorreto"),null,"hash inválido");
    assert.ok(await emitir(adm.token,quote.orcamento,canal,h1),"canal previamente vinculado em fixture isolada");
    assert.equal(await responder(app,quote.linkHash,h1,"aprovacao",false),false,"leitura obrigatória");
    assert.equal(await responder(app,quote.linkHash,sha(codigo())),false,"código errado");
    assert.equal((await admin.query(
      "SELECT falhas FROM gestao.limites_desafio_016 WHERE orcamento_id=$1 AND versao=1",
      [quote.orcamento])).rows[0].falhas,1);
    const concorrentes=await Promise.all([
      responder(app,quote.linkHash,h1),responder(app2,quote.linkHash,h1),
    ]);
    assert.deepEqual(concorrentes.sort(),[false,true],"uma resposta apenas na corrida");
    assert.equal(await responder(app,quote.linkHash,h1),false,"replay negado");
    assert.equal((await admin.query(
      "SELECT status FROM gestao.orcamentos WHERE id=$1",[quote.orcamento]
    )).rows[0].status,"aprovado");
    assert.equal((await admin.query(
      "SELECT detalhes->>'identidade_verificada' AS identidade, detalhes->>'posse_canal_confirmada' AS posse FROM gestao.auditoria WHERE entidade_id=$1 AND acao='resposta_desafio_canal_016'",[quote.orcamento]
    )).rows[0].identidade,"false");
    assert.equal((await admin.query(
      "SELECT detalhes->>'posse_canal_confirmada' AS posse FROM gestao.auditoria WHERE entidade_id=$1 AND acao='resposta_desafio_canal_016'",[quote.orcamento]
    )).rows[0].posse,"true");
    const {rows:[{id:os}]}=await app.query("SELECT gestao.criar_os_preparacao($1,$2::uuid,1) AS id",[tecnico.token,quote.orcamento]);
    assert.ok(os);
    assert.deepEqual((await admin.query(
      "SELECT status,agendada_para FROM gestao.ordens_servico WHERE id=$1",[os]
    )).rows[0],{status:"pendente",agendada_para:null});
    assert.equal((await admin.query(
      "SELECT count(*)::int AS n FROM gestao.recebimentos WHERE os_id=$1",[os]
    )).rows[0].n,0);

    const bloqueada=await criarProposta();
    const canalBloqueado=await bloqueada.vinculo(true);
    const codeB=codigo(), hb=sha(codeB);
    assert.ok(await emitir(adm.token,bloqueada.orcamento,canalBloqueado,hb));
    for(let i=1;i<=5;i++){
      assert.equal(await responder(app,bloqueada.linkHash,sha(codigo())),false);
      assert.equal((await admin.query(
        "SELECT falhas FROM gestao.limites_desafio_016 WHERE orcamento_id=$1 AND versao=1",
        [bloqueada.orcamento])).rows[0].falhas,i);
    }
    assert.equal(await responder(app,bloqueada.linkHash,hb),false,"após 5 falhas permanece bloqueado");
    assert.equal(await emitir(adm.token,bloqueada.orcamento,canalBloqueado,sha(codigo())),null,
      "reemissão não limpa a contagem acumulada");

    const expirada=await criarProposta();
    const canalExp=await expirada.vinculo(true);
    const hExp=sha(codigo());
    assert.ok(await emitir(adm.token,expirada.orcamento,canalExp,hExp));
    await admin.query(
      "UPDATE gestao.desafios_canal_016 SET emitido_em=now()-interval '12 minutes', expira_em=now()-interval '2 minutes' WHERE link_id=$1",
      [expirada.linkId]);
    assert.equal(await responder(app,expirada.linkHash,hExp),false,"expiração em 10 minutos no banco");

    const revogada=await criarProposta();
    const canalRev=await revogada.vinculo(true);
    const hRev=sha(codigo());
    assert.ok(await emitir(adm.token,revogada.orcamento,canalRev,hRev));
    await admin.query("UPDATE gestao.canais_vinculados_016 SET revogado_em=clock_timestamp() WHERE id=$1",[canalRev]);
    assert.equal(await responder(app,revogada.linkHash,hRev),false,"canal revogado bloqueia resposta");
    assert.equal(await emitir(adm.token,revogada.orcamento,canalRev,sha(codigo())),null,
      "canal revogado bloqueia emissão");

    await assert.rejects(app.query("SELECT * FROM gestao.desafios_canal_016 LIMIT 1"),
      e=>e.code==="42501","app não lê segredo");
  } finally {
    await Promise.all([app?.end().catch(()=>{}),app2?.end().catch(()=>{}),admin?.end().catch(()=>{})]);
    await root.query("DROP DATABASE IF EXISTS " + dbName + " WITH (FORCE)").catch(()=>{});
    await root.end();
  }
});
