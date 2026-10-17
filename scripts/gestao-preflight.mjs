#!/usr/bin/env node
/** Inventário somente leitura: não autoriza deploy nem modifica banco. */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

if (process.argv.length !== 3 || process.argv[2] !== "--check") {
  console.error("Uso: node scripts/gestao-preflight.mjs --check");
  process.exit(2);
}
const connectionString = process.env.DATABASE_URL_ADMIN;
if (!connectionString) {
  console.error("DATABASE_URL_ADMIN ausente. Use terminal operacional privado.");
  process.exit(2);
}
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const names = (await readdir(dir)).filter(x => /^\d{3}_[a-z0-9_]+\.sql$/.test(x)).sort();
const expected = new Map(await Promise.all(names.map(async name => [
  name, createHash("sha256").update(await readFile(path.join(dir, name), "utf8")).digest("hex"),
])));
if (names.length === 0 || new Set(names.map(n => n.slice(0, 3))).size !== names.length) {
  console.error("Catálogo de migrations inconsistente.");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 1000 });
let client, began = false, inconsistencias = 0;
const check = (ok, message) => {
  console.log((ok ? "OK " : "BLOQUEIO ") + message);
  if (!ok) inconsistencias++;
};
try {
  client = await pool.connect();
  await client.query("BEGIN READ ONLY");
  began = true;
  await client.query("SET LOCAL statement_timeout = '5s'");

  const { rows: [meta] } = await client.query(
    "SELECT to_regclass('gestao.schema_migrations')::text AS migrations, to_regclass('gestao.usuarios')::text AS usuarios, to_regclass('gestao.verificadores_senha')::text AS verificadores",
  );
  check(Boolean(meta.migrations && meta.usuarios), "schema básico da gestão existente");
  if (!meta.migrations || !meta.usuarios) throw new Error("Schema ausente");

  const { rows: migrations } = await client.query(
    "SELECT versao, checksum FROM gestao.schema_migrations ORDER BY versao",
  );
  const applied = new Map(migrations.map(x => [x.versao, x.checksum]));
  check(migrations.every(x => expected.get(x.versao) === x.checksum),
    "sem migrations desconhecidas ou divergência de checksums");
  check(names.slice(0, 4).every(name => applied.has(name)), "fundação 001–004 presente");
  console.log("ESTADO migrations: " + migrations.length + "/" + names.length);
  console.log("ESTADO migrations pendentes: " + names.filter(n => !applied.has(n)).length);

  const { rows: roles } = await client.query(
    "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = ANY($1::text[])",
    [["gestao_app", "gestao_convites"]],
  );
  const app = roles.find(x => x.rolname === "gestao_app");
  const dedicated = roles.find(x => x.rolname === "gestao_convites");
  check(Boolean(app), "role gestao_app existente");
  for (const role of roles) {
    check(!role.rolsuper && !role.rolcreatedb && !role.rolcreaterole && !role.rolbypassrls,
      "role " + role.rolname + " sem privilégios globais elevados");
  }
  console.log("ESTADO role dedicada: " + (dedicated ? "existente" : "a provisionar"));

  if (meta.verificadores) {
    const { rows: [contas] } = await client.query(
      "SELECT count(*)::integer AS total, count(*) FILTER (WHERE v.usuario_id IS NOT NULL)::integer AS prontas FROM gestao.usuarios u LEFT JOIN gestao.verificadores_senha v ON v.usuario_id=u.id WHERE u.ativo=true",
    );
    console.log("ESTADO contas ativas com verificador: " + contas.prontas + "/" + contas.total);
    check(contas.prontas === contas.total, "todas as contas ativas têm verificador SQL");
  } else {
    console.log("ESTADO verificadores: migration 008 ainda não aplicada");
  }

  if (app && applied.has("008_gestao_sessoes_protegidas.sql")) {
    const { rows: [access] } = await client.query(
      "SELECT has_table_privilege('gestao_app','gestao.sessoes','SELECT') AS ler, has_table_privilege('gestao_app','gestao.sessoes','INSERT') AS criar, has_table_privilege('gestao_app','gestao.sessoes','UPDATE') AS alterar, has_table_privilege('gestao_app','gestao.verificadores_senha','SELECT') AS verificador",
    );
    check(!access.ler && !access.criar && !access.alterar && !access.verificador,
      "gestao_app sem leitura/gravação direta de sessões ou verificadores");
  } else {
    console.log("ESTADO isolamento de sessões: verificar após migration 008/grants");
  }

  console.log("AVISO: não verifica backup, restauração, domínio, flags Railway ou disponibilidade.");
  console.log("AVISO: NÃO autoriza merge, deploy, migrations, grants nem ativação.");
  console.log("RESULTADO: " + (inconsistencias ? "INCONSISTÊNCIAS" : "SEM INCONSISTÊNCIAS ESTRUTURAIS DETECTADAS"));
} catch {
  // Mensagens SQL podem revelar URLs/dados: não expor detalhes do driver.
  console.error("BLOQUEIO leitura incompleta; conferir conexão, permissões e catálogo em terminal seguro.");
  inconsistencias++;
} finally {
  if (client) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
  await pool.end();
}
if (inconsistencias) process.exitCode = 1;
