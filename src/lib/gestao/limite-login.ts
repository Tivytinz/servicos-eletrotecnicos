import { createHash } from "node:crypto";
import { consultar } from "./db";

/** Limite compartilhado entre instâncias; falha fechada se PostgreSQL estiver indisponível. */
export async function permitirTentativaLogin(email: string): Promise<boolean> {
  const chave = createHash("sha256").update(email).digest("hex");
  const linhas = await consultar<{ tentativas: number }>(`
    INSERT INTO gestao.tentativas_login AS t (chave_hash, inicio_janela, tentativas)
    VALUES ($1, now(), 1)
    ON CONFLICT (chave_hash) DO UPDATE SET
      inicio_janela = CASE WHEN t.inicio_janela < now() - interval '15 minutes'
        THEN now() ELSE t.inicio_janela END,
      tentativas = CASE WHEN t.inicio_janela < now() - interval '15 minutes'
        THEN 1 ELSE t.tentativas + 1 END
    RETURNING tentativas
  `, [chave]);
  return (linhas[0]?.tentativas ?? 6) <= 5;
}
