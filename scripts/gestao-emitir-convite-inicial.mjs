#!/usr/bin/env node
/**
 * Primeiro acesso de administradores existentes, quando ninguém tem sessão.
 * Uso MANUAL no terminal operacional privado (nunca no build/CI ou serviço web).
 * O script gera token aleatório e guarda apenas SHA-256 no PostgreSQL.
 * Link deve ser entregue em canal privado ao titular após confirmar identidade.
 */
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const user = (process.env.GESTAO_BOOTSTRAP_USUARIO ?? "").trim().toLowerCase();
const originString = process.env.GESTAO_ORIGEM_PUBLICA ?? "";
const url = process.env.DATABASE_URL_ADMIN;
const confirmation = process.env.GESTAO_BOOTSTRAP_CONFIRM;
if (process.argv.length !== 3 || process.argv[2] !== "--apply"
  || confirmation !== "EMITIR_CONVITE_INICIAL" || process.env.CI === "true"
  || !url || !/^[a-z][a-z0-9_.-]{2,31}$/.test(user)) {
  console.error("Uso operacional privado: GESTAO_BOOTSTRAP_USUARIO, GESTAO_ORIGEM_PUBLICA HTTPS e DATABASE_URL_ADMIN; GESTAO_BOOTSTRAP_CONFIRM=EMITIR_CONVITE_INICIAL node scripts/gestao-emitir-convite-inicial.mjs --apply.");
  process.exit(2);
}

let origin;
try {
  const address = new URL(originString);
  if (address.protocol !== "https:" || !address.hostname
    || address.username || address.password
    || address.search || address.hash || address.pathname !== "/") {
    throw new Error("invalid");
  }
  origin = address.origin;
} catch {
  console.error("GESTAO_ORIGEM_PUBLICA deve ser origem HTTPS pública exata, sem caminho, query ou credenciais.");
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  const { rows: [{ ready }] } = await client.query(
    "SELECT count(*)::integer = 5 AS ready FROM gestao.schema_migrations WHERE versao = ANY($1::text[])",
    [[
      "005_gestao_convites.sql",
      "006_gestao_convites_funcoes.sql",
      "007_gestao_listar_convites.sql",
      "008_gestao_sessoes_protegidas.sql",
      "009_gestao_aceite_verificado.sql",
    ]],
  );
  if (!ready) throw new Error("Migrations 005–009 não estão completas.");

  const { rows: accounts } = await client.query(
    "SELECT u.id FROM gestao.usuarios u JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id WHERE u.usuario = $1 AND u.ativo = true AND p.papel_codigo = 'admin' FOR UPDATE OF u",
    [user],
  );
  if (accounts.length !== 1) throw new Error("Conta administrativa ativa não encontrada.");
  const id = accounts[0].id;

  if ((await client.query(
    "SELECT 1 FROM gestao.verificadores_senha WHERE usuario_id=$1", [id],
  )).rowCount) {
    throw new Error("Conta já ativada. Não emitir convite inicial novamente.");
  }
  await client.query(
    "UPDATE gestao.convites SET revogado_em=clock_timestamp() WHERE usuario=$1 AND usado_em IS NULL AND revogado_em IS NULL AND expira_em <= clock_timestamp()",
    [user],
  );

  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  const { rows: [invite] } = await client.query(
    "INSERT INTO gestao.convites (token_hash, usuario, papel_codigo, criado_por, usuario_existente_id, expira_em) VALUES ($1, $2, 'admin', NULL, $3, clock_timestamp() + interval '24 hours') RETURNING id",
    [hash, user, id],
  );
  await client.query(
    "INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes) VALUES (NULL, 'convite', $1, 'emissao_inicial_operacional', jsonb_build_object('usuario', $2, 'perfil', 'admin'))",
    [invite.id, user],
  );
  await client.query("COMMIT");

  // O link é exibido uma única vez, somente no terminal privado do operador.
  console.log("CONVITE INICIAL (24 horas, uso único) — ENTREGAR SOMENTE AO TITULAR:");
  console.log(origin + "/gestao/convite#" + token);
  console.log("Não compartilhar em chat, prints, GitHub, logs ou canais públicos.");
} catch (err) {
  if (client) await client.query("ROLLBACK").catch(() => {});
  // Evitar imprimir detalhes do driver que possam incluir credenciais.
  const safe = ["Migrations 005–009 não estão completas.",
    "Conta administrativa ativa não encontrada.",
    "Conta já ativada. Não emitir convite inicial novamente."];
  console.error(err instanceof Error && safe.includes(err.message)
    ? err.message : "Operação bloqueada; revisar schema, permissões e convites pendentes em terminal privado.");
  process.exitCode = 1;
} finally {
  if (client) client.release();
  await pool.end();
}
