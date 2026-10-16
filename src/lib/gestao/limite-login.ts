import { createHash } from "node:crypto";
import { SQL_LIMITAR_LOGIN } from "./queries";
import { consultar } from "./db";

/** Limite compartilhado entre instâncias; falha fechada se PostgreSQL estiver indisponível. */
export async function permitirTentativaLogin(email: string): Promise<boolean> {
  const chave = createHash("sha256").update(email).digest("hex");
  const linhas = await consultar<{ tentativas: number }>(
    SQL_LIMITAR_LOGIN, [chave],
  );
  return (linhas[0]?.tentativas ?? 6) <= 5;
}
