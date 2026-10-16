import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const COOKIE_SESSAO = "__Host-eg_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8;

export function criarTokenSessao(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenSessao(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Formato scrypt$N$r$p$saltHex$hashHex, sem armazenar senha em texto. */
export function criarHashSenha(senha: string): string {
  if (senha.length < 12 || senha.length > 1024) {
    throw new RangeError("Senha deve ter de 12 a 1024 caracteres");
  }
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verificarSenha(senha: string, registro: string): boolean {
  if (senha.length > 1024) return false;
  const partes = registro.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, hashHex] = partes;
  if (n !== "16384" || r !== "8" || p !== "1"
    || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(hashHex)) {
    return false;
  }
  const esperado = Buffer.from(hashHex, "hex");
  const recebido = scryptSync(senha, Buffer.from(saltHex, "hex"), esperado.length,
    { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(esperado, recebido);
}
