#!/usr/bin/env node
/**
 * Executor explícito de migrations do Eletrotécnico GO.
 * Requer DATABASE_URL_ADMIN de proprietário do schema, exclusivamente no processo operacional.
 * --check é somente leitura; --apply exige confirmação explícita.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";

const mode = process.argv[2];
if (!["--check", "--apply"].includes(mode) || process.argv.length !== 3) {
  console.error("Uso: node scripts/gestao-migrate.mjs --check|--apply");
  process.exit(2);
}
if (mode === "--apply" && process.env.GESTAO_MIGRATIONS_CONFIRM !== "APLICAR_GESTAO") {
  console.error("Aplicação bloqueada: defina GESTAO_MIGRATIONS_CONFIRM=APLICAR_GESTAO");
  process.exit(2);
}
const connectionString = process.env.DATABASE_URL_ADMIN;
if (!connectionString) {
  console.error("DATABASE_URL_ADMIN ausente. Não exponha esta credencial ao serviço web.");
  process.exit(2);
}
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const names = (await readdir(dir)).filter((x) => /^\d{3}_[a-z0-9_]+\.sql$/.test(x)).sort();
if (!names.length || names.length !== new Set(names.map((x) => x.slice(0, 3))).size) {
  throw new Error("Nomes ou versões de migration inválidos");
}
const migrations = await Promise.all(names.map(async (name) => {
  const sql = await readFile(path.join(dir, name), "utf8");
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(sql)) {
    throw new Error(`Migration ${name} não pode controlar transações`);
  }
  return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
}));
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5_000 });
let client;
try {
  client = await pool.connect();
  if (mode === "--apply") {
    // Trava de sessão evita duas execuções concorrentes.
    await client.query("SELECT pg_advisory_lock(20261016, 1)");
    await client.query("BEGIN");
    try {
      await client.query("CREATE SCHEMA IF NOT EXISTS gestao");
      await client.query(`
        CREATE TABLE IF NOT EXISTS gestao.schema_migrations (
          versao text PRIMARY KEY,
          checksum text NOT NULL CHECK (length(checksum) = 64),
          aplicada_em timestamptz NOT NULL DEFAULT now()
        )
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  const exists = await client.query("SELECT to_regclass('gestao.schema_migrations') AS tabela");
  const rows = exists.rows[0].tabela
    ? (await client.query("SELECT versao, checksum FROM gestao.schema_migrations")).rows
    : [];
  const applied = new Map(rows.map((r) => [r.versao, r.checksum]));
  for (const version of applied.keys()) {
    if (!migrations.some((m) => m.name === version)) {
      throw new Error(`Migration desconhecida já aplicada: ${version}`);
    }
  }
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      if (applied.get(migration.name) !== migration.checksum) {
        throw new Error(`DRIFT: checksum divergente em ${migration.name}`);
      }
      console.log(`OK ${migration.name}`);
      continue;
    }
    if (mode === "--check") {
      console.log(`PENDENTE ${migration.name}`);
      process.exitCode = 1;
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO gestao.schema_migrations (versao, checksum) VALUES ($1, $2)",
        [migration.name, migration.checksum],
      );
      await client.query("COMMIT");
      console.log(`APLICADA ${migration.name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} catch (error) {
  console.error("Falha na validação de migrations:", error instanceof Error ? error.message : "erro");
  process.exitCode = 1;
} finally {
  if (client) {
    if (mode === "--apply") {
      await client.query("SELECT pg_advisory_unlock(20261016, 1)").catch(() => {});
    }
    client.release();
  }
  await pool.end();
}
