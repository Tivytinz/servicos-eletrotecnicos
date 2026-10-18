"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { consultarConvitesAdmin } from "@/lib/gestao/db-convites";
import { verificarSenha } from "@/lib/gestao/sessao";
import { permitirTentativaLogin } from "@/lib/gestao/limite-login";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";
import { COOKIE_SESSAO, hashTokenSessao } from "@/lib/gestao/sessao";

/** Revogar um link só funciona com sessão de administrador ativa e Origin válido. */
export async function revogarConvite(formData: FormData): Promise<void> {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_CONVITES_HABILITADOS !== "true") {
    throw new Error("Convites indisponíveis");
  }
  const h = await headers();
  if (!origemConvitePermitida(h.get("origin"), h.get("host"), process.env.GESTAO_ORIGEM_PUBLICA)) {
    throw new Error("Origem não autorizada");
  }
  const ator = await usuarioAtual();
  if (!ator || !ator.papeis.includes("admin")) {
    throw new Error("Acesso negado");
  }

  if (!(await permitirTentativaLogin("convite:revogacao:" + ator.id))) {
    throw new Error("Muitas tentativas");
  }
  const senha = String(formData.get("senhaAdministrador") ?? "");
  if (senha.length < 12 || senha.length > 1024) throw new Error("Confirme sua senha");
  const [credencial] = await consultar<{ senha_hash: string }>(
    "SELECT senha_hash FROM gestao.usuarios WHERE id=$1 AND ativo=true", [ator.id],
  );
  if (!credencial || !verificarSenha(senha, credencial.senha_hash)) {
    throw new Error("Senha de administrador incorreta");
  }

  const id = String(formData.get("id") ?? "");
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) {
    throw new Error("Convite inválido");
  }
  const cookie = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!cookie || !/^[A-Za-z0-9_-]{43}$/.test(cookie)) {
    throw new Error("Sessão inválida");
  }
  // A função no PostgreSQL revalida a sessão admin e bloqueia a linha até concluir.
  await consultarConvitesAdmin<{ revogado: boolean }>(
    "SELECT gestao.revogar_convite($1,$2::uuid) AS revogado",
    [hashTokenSessao(cookie), id],
  );
  revalidatePath("/gestao/convites");
}
