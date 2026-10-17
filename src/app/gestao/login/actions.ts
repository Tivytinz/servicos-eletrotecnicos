"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { consultar } from "@/lib/gestao/db";
import {
  COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS,
  criarTokenSessao, hashTokenSessao, verificarSenha, criarHashSenha,
} from "@/lib/gestao/sessao";
import { permitirTentativaLogin } from "@/lib/gestao/limite-login";
import { normalizarIdentificador } from "@/lib/gestao/identificador";
import { origemPermitida } from "@/lib/gestao/origem";

const HASH_FICTICIO = criarHashSenha("credencial-ficticia-para-equalizar-tempo");

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

  const candidatos = await consultar<{ id: string; senha_hash: string }>(`
    SELECT id, senha_hash FROM gestao.usuarios
    WHERE (usuario = $1 OR email = $1) AND ativo = true LIMIT 1
  `, [identificador]);

  const senhaValida = verificarSenha(senha, candidatos[0]?.senha_hash ?? HASH_FICTICIO);
  if (!candidatos[0] || !senhaValida) {
    // Evitar distinção entre usuário inexistente e senha incorreta na resposta.
    redirect("/gestao/login?erro=credenciais");
  }

  const token = criarTokenSessao();
  const chave = hashTokenSessao(token);
  await consultar(`
    INSERT INTO gestao.sessoes (id, usuario_id, token_hash, expira_em)
    VALUES ($1, $2, $3, now() + interval '8 hours')
  `, [randomUUID(), candidatos[0].id, chave]);

  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true, secure: true, sameSite: "strict",
    path: "/", maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  redirect("/gestao");
}

export async function sair(): Promise<void> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (token) {
    await consultar("UPDATE gestao.sessoes SET revogada_em = now() WHERE token_hash = $1",
      [hashTokenSessao(token)]);
  }
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/gestao/login");
}
