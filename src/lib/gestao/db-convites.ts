import { Pool, type QueryResultRow } from "pg";

/** Conexão específica de operações administrativas.
 * Proibir reutilização silenciosa de DATABASE_URL, inclusive em homologação.
 */
let pool: Pool | undefined;
function getPoolConvites(): Pool {
  const url = process.env.DATABASE_URL_CONVITES;
  if (!url || url === process.env.DATABASE_URL) {
    throw new Error("Convites indisponíveis: credencial administrativa isolada ausente");
  }
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)
    || decodeURIComponent(parsed.username) !== "gestao_convites") {
    throw new Error("Credencial de convites inválida");
  }
  pool ??= new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 15_000 });
  return pool;
}

export async function consultarConvitesAdmin<T extends QueryResultRow>(
  sql: string, parametros: readonly unknown[] = [],
): Promise<T[]> {
  const res = await getPoolConvites().query<T>(sql, [...parametros]);
  return res.rows;
}
