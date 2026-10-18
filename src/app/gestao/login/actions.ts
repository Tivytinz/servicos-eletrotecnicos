"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { consultar } from "@/lib/gestao/db";
import {
  COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS,
  criarTokenSessao, hashTokenSessao,
} from "@/lib/gestao/sessao";
import { permitirTentativaLogin } from "@/lib/gestao/limite-login";
import { normalizarIdentificador } from "@/lib/gestao/identificador";
import { origemPermitida } from "@/lib/gestao/origem";

export async function entrar(formData: FormData): Promise<void> {
  if (process.env.GESTAO_HABILITADA !== "true") redirect("/");
  const cabecalhos = await headers();
  const host = cabecalhos.get("host");
  if (!origemPermitida(cabecalhos.get("origin"), host)) {
    throw new Error("Origem não autorizada");
  }
  const identificador = normalizarIdentificador(String(formData.get("identificador") ?? ""));
  const senha = String(formData.get("senha") ?? "");
  if (!identificador || senha.length < 12 || senha.length > 1024) {
    redirect("/gestao/login?erro=credenciais");
  }

  if (!(await permitirTentativaLogin(identificador))) {
    redirect("/gestao/login?erro=credenciais");
  }

  const token = criarTokenSessao();
  const chave = hashTokenSessao(token);
  const [resultado] = await consultar<{ id: string | null }>(
    "SELECT gestao.emitir_sessao_segura($1,$2,$3) AS id",
    [identificador, senha, chave],
  );
  if (!resultado?.id) redirect("/gestao/login?erro=credenciais");

  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true, secure: true, sameSite: "strict",
    path: "/", maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  redirect("/gestao");
}

export async function sair(): Promise<void> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (token) {
    await consultar("SELECT gestao.revogar_sessao_segura($1) AS revogada", [token]);
  }
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/gestao/login");
}
