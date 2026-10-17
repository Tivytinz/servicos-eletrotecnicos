import { createHash } from "node:crypto";
import { SQL_LIMITAR_LOGIN } from "./queries";
import { consultar } from "./db";

const LIMITE_IDENTIFICADOR = 5;
const LIMITE_GLOBAL = 300;
const JANELA_MINUTOS = 15;

/** Domínios separados evitam colisões entre identificadores e o contador global. */
export function chaveTentativaLogin(escopo: "identificador" | "global", valor = ""): string {
  return createHash("sha256").update(`gestao-login:${escopo}:${valor}`).digest("hex");
}

export const limitesLogin = Object.freeze({
  porIdentificador: LIMITE_IDENTIFICADOR,
  global: LIMITE_GLOBAL,
  janelaMinutos: JANELA_MINUTOS,
});

/**
 * Defesa em profundidade usando a tabela já provisionada.
 * O limite global impede tentativas ilimitadas com identificadores diferentes
 * sem confiar em cabeçalhos de IP potencialmente falsificáveis.
 * Risco residual: atacante pode esgotar o orçamento global e impedir logins
 * legítimos até a próxima janela; não substitui rate limit/WAF na borda.
 * Falha fechada quando o PostgreSQL está indisponível.
 */
export async function permitirTentativaLogin(identificador: string): Promise<boolean> {
  const global = await consultar<{ tentativas: number }>(
    SQL_LIMITAR_LOGIN, [chaveTentativaLogin("global")],
  );
  if ((global[0]?.tentativas ?? LIMITE_GLOBAL + 1) > LIMITE_GLOBAL) return false;

  const conta = await consultar<{ tentativas: number }>(
    SQL_LIMITAR_LOGIN, [chaveTentativaLogin("identificador", identificador)],
  );
  return (conta[0]?.tentativas ?? LIMITE_IDENTIFICADOR + 1) <= LIMITE_IDENTIFICADOR;
}
