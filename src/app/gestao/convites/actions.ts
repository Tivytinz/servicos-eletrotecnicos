"use server";

import { cookies, headers } from "next/headers";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { criarTokenConvite, hashTokenConvite, validarUsuarioConvite } from "@/lib/gestao/convites";
import { permitirTentativaLogin } from "@/lib/gestao/limite-login";
import { origemPermitida } from "@/lib/gestao/origem";
import { COOKIE_SESSAO, hashTokenSessao } from "@/lib/gestao/sessao";

export type EstadoEmissao = { erro: string | null; link: string | null };
const ERRO = "Não foi possível criar o convite. Confira os dados e tente novamente.";

export async function emitirConvite(_prev: EstadoEmissao, formData: FormData): Promise<EstadoEmissao> {
  void _prev;
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_CONVITES_HABILITADOS !== "true") {
    return { erro: "Convites indisponíveis.", link: null };
  }
  const h = await headers();
  const origin = h.get("origin");
  if (!origemPermitida(origin, h.get("host"))) {
    return { erro: "Origem não autorizada.", link: null };
  }
  const usuarioAtualLogado = await usuarioAtual();
  if (!usuarioAtualLogado || !usuarioAtualLogado.papeis.includes("admin")) {
    return { erro: "Acesso negado.", link: null };
  }
  const cookie = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!cookie || !/^[A-Za-z0-9_-]{43}$/.test(cookie)) {
    return { erro: "Sessão inválida.", link: null };
  }

  const nomeUsuario = validarUsuarioConvite(String(formData.get("usuario") ?? ""));
  const papel = String(formData.get("papel") ?? "");
  if (!nomeUsuario || !["admin", "comercial", "tecnico"].includes(papel)) {
    return { erro: "Usuário ou perfil inválido.", link: null };
  }
  // Limite persistente compartilhado entre instâncias e protegido por lock no DB.
  if (!(await permitirTentativaLogin("convite:emissao:" + usuarioAtualLogado.id))) {
    return { erro: "Muitas tentativas. Aguarde antes de tentar novamente.", link: null };
  }

  const token = criarTokenConvite();
  const resultado = await consultar<{ id: string | null }>(
    "SELECT gestao.emitir_convite($1,$2,$3,$4) AS id",
    [hashTokenSessao(cookie), hashTokenConvite(token), nomeUsuario, papel],
  );
  if (!resultado[0]?.id) return { erro: ERRO, link: null };
  // Token entregue uma vez na resposta autenticada, jamais armazenado no banco,
  // em query string, logs ou eventos analíticos. Fragmento não é enviado em requisições HTTP.
  return { erro: null, link: `${origin}/gestao/convite#${token}` };
}
