"use server";

import { headers } from "next/headers";
import { criarHashSenha } from "@/lib/gestao/sessao";
import { hashTokenConvite } from "@/lib/gestao/convites";
import { consultar } from "@/lib/gestao/db";
import { permitirTentativaLogin } from "@/lib/gestao/limite-login";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";

export type EstadoAceite = { erro: string | null; sucesso: boolean };
const ERRO = "Convite inválido, expirado, já utilizado ou indisponível.";

export async function aceitarConvite(_prev: EstadoAceite, formData: FormData): Promise<EstadoAceite> {
  void _prev;
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_CONVITES_HABILITADOS !== "true") {
    return { erro: "Convites indisponíveis.", sucesso: false };
  }
  const h = await headers();
  if (!origemConvitePermitida(h.get("origin"), h.get("host"), process.env.GESTAO_ORIGEM_PUBLICA)) {
    return { erro: "Origem não autorizada.", sucesso: false };
  }
  const token = String(formData.get("token") ?? "");
  let tokenHash: string;
  try {
    tokenHash = hashTokenConvite(token);
  } catch {
    return { erro: ERRO, sucesso: false };
  }
  if (!(await permitirTentativaLogin("convite:aceite:" + tokenHash))) {
    return { erro: "Muitas tentativas. Aguarde.", sucesso: false };
  }
  const nome = String(formData.get("nome") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  if (nome.length < 2 || nome.length > 160 || senha.length < 12
    || senha.length > 1024 || senha !== confirmacao) {
    return { erro: "Confira o nome e a senha (mínimo 12 caracteres).", sucesso: false };
  }
  const [resultado] = await consultar<{ id: string | null }>(
    "SELECT gestao.aceitar_convite($1,$2,$3) AS id",
    [tokenHash, nome, criarHashSenha(senha)],
  );
  if (!resultado?.id) return { erro: ERRO, sucesso: false };
  return { erro: null, sucesso: true };
}
