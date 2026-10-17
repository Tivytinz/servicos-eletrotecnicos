import { createHash } from "node:crypto";

/** Limites por janela de 15 minutos, compartilhados por todas as instâncias. */
export const limitesLogin = Object.freeze({
  porIdentificador: 5,
  global: 300,
  janelaMinutos: 15,
});

/** Domínios separados evitam colisões entre identificadores e o contador global. */
export function chaveTentativaLogin(escopo: "identificador" | "global", valor = ""): string {
  return createHash("sha256").update(`gestao-login:${escopo}:${valor}`).digest("hex");
}
