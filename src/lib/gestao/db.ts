import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;

/** Pool só é criado em ambiente de servidor com DATABASE_URL configurada. */
function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Gestão indisponível: banco não configurado");
  pool ??= new Pool({ connectionString, max: 5, idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 5_000 });
  return pool;
}

export async function consultar<T extends QueryResultRow>(
  sql: string, parametros: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, [...parametros]);
  return result.rows;
}
