#!/usr/bin/env node
// Diagnóstico somente de leitura para executar no Console do serviço web do Railway.
// Não imprime DATABASE_URL, host, senha nem dados de clientes.
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  process.stderr.write("ERRO: DATABASE_URL não configurada.\n");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 1_000,
});
try {
  const { rows } = await pool.query(`
    SELECT
      current_user AS usuario,
      current_database() AS banco,
      has_schema_privilege(current_user, 'gestao', 'USAGE') AS esquema,
      has_table_privilege(current_user, 'gestao.clientes', 'INSERT') AS clientes,
      has_table_privilege(current_user, 'gestao.sessoes', 'INSERT') AS sessoes,
      has_table_privilege(current_user, 'gestao.lancamentos_financeiros', 'INSERT') AS financeiro,
      (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superusuario
  `);
  const item = rows[0];
  const seguro = item?.usuario === "gestao_app"
    && item.esquema === true && item.clientes === true && item.sessoes === false
    && item.financeiro === false && item.superusuario === false;
  process.stdout.write(`Conexão privada: ${seguro ? "APROVADA" : "REPROVADA"}\n`);
  process.stdout.write(`Role: ${item?.usuario === "gestao_app" ? "gestao_app" : "inesperada"}\n`);
  process.stdout.write(`Banco: ${item?.banco === "railway" ? "railway" : "outro"}\n`);
  process.stdout.write(`Acesso clientes: ${item?.clientes ? "sim" : "não"}; escrita direta de sessões: ${item?.sessoes ? "PERMITIDA (RISCO)" : "negada"}\n`);
  process.stdout.write(`Escrita financeira: ${item?.financeiro ? "PERMITIDA (RISCO)" : "negada"}\n`);
  if (!seguro) process.exitCode = 1;
} catch (error) {
  // Mensagens do driver podem conter endereço ou detalhes da URL; não exibi-las.
  process.stderr.write("ERRO: conexão ou validação falhou. Confira a URL privada e a senha no Railway.\n");
  process.exitCode = 1;
} finally {
  await pool.end();
}
