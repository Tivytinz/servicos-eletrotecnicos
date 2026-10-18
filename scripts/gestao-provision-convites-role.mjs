#!/usr/bin/env node
/** Provisionamento explícito da role SQL isolada para operações administrativas.
 * Exige DATABASE_URL_ADMIN somente em processo operacional, NUNCA no serviço web.
 * Não imprime senha, URL de conexão nem segredo.
 */
import { Pool } from "pg";

if (process.argv.length !== 3 || process.argv[2] !== "--apply"
  || process.env.GESTAO_CONVITES_ROLE_CONFIRM !== "CRIAR_ROLE_CONVITES") {
  console.error("Uso: GESTAO_CONVITES_ROLE_CONFIRM=CRIAR_ROLE_CONVITES node scripts/gestao-provision-convites-role.mjs --apply");
  process.exit(2);
}
const adminUrl = process.env.DATABASE_URL_ADMIN;
const password = process.env.GESTAO_CONVITES_PASSWORD;
if (!adminUrl || !password || password.length < 32 || password.length > 256) {
  console.error("Credenciais operacionais ausentes ou senha fora de 32–256 caracteres.");
  process.exit(2);
}
let url;
try {
  url = new URL(adminUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Protocolo");
  url.username = "gestao_convites";
  url.password = password;
} catch {
  console.error("Conexão operacional inválida.");
  process.exit(2);
}
const pool = new Pool({ connectionString: adminUrl, max: 1, connectionTimeoutMillis: 5000 });
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(20261016, 3)");
  if ((await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'gestao_convites'")).rowCount) {
    throw new Error("Role gestao_convites já existe: não substituir senha automaticamente");
  }
  for (const fn of [
    "gestao.emitir_convite(text,text,text,text)",
    "gestao.aceitar_convite(text,text,text,text)",
    "gestao.revogar_convite(text,uuid)",
    "gestao.listar_convites(text)",
  ]) {
    if (!(await client.query("SELECT to_regprocedure($1) AS fn", [fn])).rows[0].fn) {
      throw new Error("Funções de convites ainda não estão instaladas");
    }
  }
  await client.query("SET LOCAL password_encryption = 'scram-sha-256'");
  const escaped = (await client.query("SELECT quote_literal($1) AS literal", [password])).rows[0].literal;
  await client.query(`CREATE ROLE gestao_convites LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${escaped}`);
  await client.query("GRANT USAGE ON SCHEMA gestao TO gestao_convites");
  await client.query("GRANT EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) TO gestao_convites");
  await client.query("GRANT EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) TO gestao_convites");
  await client.query("GRANT EXECUTE ON FUNCTION gestao.listar_convites(text) TO gestao_convites");
  await client.query("REVOKE EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) FROM gestao_app");
  await client.query("REVOKE EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) FROM gestao_app");
  await client.query("REVOKE EXECUTE ON FUNCTION gestao.listar_convites(text) FROM gestao_app");
  await client.query("COMMIT");
  console.log("Role isolada gestao_convites provisionada com privilégios limitados.");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error("Provisionamento bloqueado:", error instanceof Error ? error.message : "erro");
  process.exitCode = 1;
} finally {
  if (client) client.release();
  await pool.end();
}
if (!process.exitCode) {
  const check = new Pool({ connectionString: url.toString(), max: 1, connectionTimeoutMillis: 5000 });
  try {
    const q = await check.query(`SELECT
      has_function_privilege(current_user, 'gestao.emitir_convite(text,text,text,text)', 'EXECUTE') AS emitir,
      has_function_privilege(current_user, 'gestao.aceitar_convite(text,text,text,text)', 'EXECUTE') AS aceitar,
      has_table_privilege(current_user, 'gestao.sessoes', 'INSERT') AS insere_sessao`);
    if (!q.rows[0].emitir || q.rows[0].aceitar || q.rows[0].insere_sessao) {
      throw new Error("Permissões excessivas ou incompletas");
    }
    console.log("Verificação: emissão permitida, aceite e escrita de sessões negados.");
  } catch {
    console.error("Atenção: validação da role falhou; não configurar conexão no serviço web.");
    process.exitCode = 1;
  } finally { await check.end(); }
}
