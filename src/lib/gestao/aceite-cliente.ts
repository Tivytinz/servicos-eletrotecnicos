import { createHash, randomBytes } from "node:crypto";

/** Token aleatório de 256 bits; o valor bruto nunca persiste no PostgreSQL. */
export function criarTokenAceiteCliente(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenAceiteCliente(token: string): string | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return createHash("sha256").update(token,"utf8").digest("hex");
}
