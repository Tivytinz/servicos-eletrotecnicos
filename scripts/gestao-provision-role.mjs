#!/usr/bin/env node
/**
 * Provisiona uma role SQL exclusiva, de menor privilégio, para a gestão.
 * Execução manual no Railway, dentro da rede privada. Não registrar segredos.
 */
import { Pool } from "pg";

const adminUrl = process.env.DATABASE_URL_ADMIN;
const password = process.env.GESTAO_APP_PASSWORD;
if (process.argv.length !== 3 || process.argv[2] !== "--apply"
  || process.env.GESTAO_ROLE_CONFIRM !== "CRIAR_GESTAO_APP") {
  console.error("Uso: GESTAO_ROLE_CONFIRM=CRIAR_GESTAO_APP node scripts/gestao-provision-role.mjs --apply");
  process.exit(2);
}
if (!adminUrl || !password || password.length < 32 || password.length > 256) {
  console.error("Credenciais ausentes ou senha de aplicação fora do intervalo 32–256 caracteres.");
  process.exit(2);
}
let appUrl;
try {
  const url = new URL(adminUrl);
  if (!["postgresql:", "postgres:"].includes(url.protocol)) throw new Error("Protocolo inválido");
  url.username = "gestao_app";
  url.password = password;
  appUrl = url.toString();
} catch {
  console.error("DATABASE_URL_ADMIN inválida.");
  process.exit(2);
}

const adminPool = new Pool({ connectionString: adminUrl, max: 1, connectionTimeoutMillis: 5000 });
let admin;
try {
  admin = await adminPool.connect();
  await admin.query("BEGIN");
  await admin.query("SELECT pg_advisory_xact_lock(20261016, 2)");
  const exists = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = 'gestao_app'");
  if (exists.rowCount) {
    throw new Error("Role gestao_app já existe; não substituir senha automaticamente");
  }
  const schema = await admin.query("SELECT to_regclass('gestao.sessoes') AS sessoes, to_regclass('gestao.leads') AS leads, to_regclass('gestao.tentativas_login') AS tentativas");
  if (!schema.rows[0].sessoes || !schema.rows[0].leads || !schema.rows[0].tentativas) {
    throw new Error("Migrations da gestão ainda não aplicadas");
  }
  await admin.query("SET LOCAL password_encryption = 'scram-sha-256'");
  const literal = await admin.query("SELECT quote_literal($1) AS quoted", [password]);
  await admin.query(`CREATE ROLE gestao_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${literal.rows[0].quoted}`);
  await admin.query("GRANT USAGE ON SCHEMA gestao TO gestao_app");
  await admin.query("GRANT SELECT ON gestao.usuarios, gestao.usuarios_papeis TO gestao_app");
  await admin.query("GRANT SELECT, INSERT, UPDATE ON gestao.sessoes TO gestao_app");
  await admin.query("GRANT SELECT, INSERT ON gestao.clientes, gestao.leads TO gestao_app");
  await admin.query("GRANT SELECT, INSERT, UPDATE ON gestao.tentativas_login TO gestao_app");
  await admin.query("GRANT EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) TO gestao_app");
  await admin.query("GRANT EXECUTE ON FUNCTION gestao.aceitar_convite(text,text,text) TO gestao_app");
  await admin.query("GRANT EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) TO gestao_app");
  await admin.query("COMMIT");
  console.log("Role gestao_app criada com privilégios limitados.");
} catch (error) {
  if (admin) await admin.query("ROLLBACK").catch(() => {});
  console.error("Provisionamento falhou:", error instanceof Error ? error.message : "erro");
  process.exitCode = 1;
} finally {
  if (admin) admin.release();
  await adminPool.end();
}
if (!process.exitCode) {
  const appPool = new Pool({ connectionString: appUrl, max: 1, connectionTimeoutMillis: 5000 });
  let app;
  try {
    app = await appPool.connect();
    await app.query("BEGIN");
    await app.query("SELECT id FROM gestao.clientes LIMIT 1");
    await app.query("SAVEPOINT financeiro");
    let denied = false;
    try {
      await app.query("UPDATE gestao.lancamentos_financeiros SET valor_centavos = 1 WHERE false");
    } catch (error) {
      denied = error.code === "42501";
    }
    await app.query("ROLLBACK TO SAVEPOINT financeiro");
    if (!denied) throw new Error("Privilégios financeiros excessivos: revisão obrigatória");
    console.log("Verificação: acesso de leitura permitido; escrita financeira negada.");
  } catch (error) {
    console.error("Verificação da role falhou:", error instanceof Error ? error.message : "erro");
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.query("ROLLBACK").catch(() => {});
      app.release();
    }
    await appPool.end();
  }
}
