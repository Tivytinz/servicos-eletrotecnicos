import { createHash, randomBytes } from "node:crypto";
import { normalizarIdentificador } from "./identificador";

export const CONVITE_VALIDADE_HORAS = 24;
export const CONVITE_TOKEN_BYTES = 32;

/** O token em texto puro deve existir apenas na emissão e no acesso ao link. */
export function criarTokenConvite(): string {
  return randomBytes(CONVITE_TOKEN_BYTES).toString("base64url");
}

export function hashTokenConvite(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("Token de convite inválido");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function validarUsuarioConvite(valor: string): string | null {
  const usuario = normalizarIdentificador(valor);
  return usuario && !usuario.includes("@") ? usuario : null;
}

export function convitePodeSerUsado(
  convite: { expira_em: Date; usado_em: Date | null; revogado_em: Date | null },
  agora: Date = new Date(),
): boolean {
  return !convite.usado_em && !convite.revogado_em && convite.expira_em.getTime() > agora.getTime();
}
