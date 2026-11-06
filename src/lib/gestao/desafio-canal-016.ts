/**
 * Release 016 — primitives locais para um desafio de canal secundário.
 *
 * NÃO é autenticação civil, assinatura eletrônica nem um fluxo ativo.
 * Apenas as rotinas de geração, hash e comparação de segredo estão prontas.
 * O controle transacional de expiração, tentativas, vinculação ao link e
 * isolamento de canais DEVERÁ residir no PostgreSQL antes de qualquer uso.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PRAZO_DESAFIO_MS = 10 * 60 * 1000;
export const MAX_TENTATIVAS_DESAFIO = 5;
export const TAMANHO_CODIGO_DESAFIO = 16;

const FORMATO = /^[A-Za-z0-9_-]{16}$/;
const SHA256 = /^[a-f0-9]{64}$/;

/** 96 bits aleatórios, codificados em 16 caracteres base64url. */
export function criarCodigoDesafioCanal(): string {
  return randomBytes(12).toString("base64url");
}

/** Nunca persista ou audite o código bruto; armazene somente o hash. */
export function hashCodigoDesafioCanal(codigo: string): string | null {
  if (typeof codigo !== "string" || !FORMATO.test(codigo)) return null;
  return createHash("sha256").update(codigo, "utf8").digest("hex");
}

/** Comparação constante para hashes de comprimento validado. */
export function conferirCodigoDesafioCanal(codigo: string, hashPersistido: string): boolean {
  const calculado = hashCodigoDesafioCanal(codigo);
  if (!calculado || typeof hashPersistido !== "string" || !SHA256.test(hashPersistido)) return false;
  return timingSafeEqual(Buffer.from(calculado, "hex"), Buffer.from(hashPersistido, "hex"));
}

/** Apenas referência de prazo; o banco é a autoridade do tempo e das tentativas. */
export function prazoDesafioCanal(agora: Date): Date {
  if (!(agora instanceof Date) || !Number.isFinite(agora.getTime())) {
    throw new TypeError("Instante de emissão inválido");
  }
  return new Date(agora.getTime() + PRAZO_DESAFIO_MS);
}
