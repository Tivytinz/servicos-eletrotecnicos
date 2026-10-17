"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { origemPermitida } from "@/lib/gestao/origem";
import { criarTokenConvite, hashTokenConvite, validarUsuarioConvite } from "@/lib/gestao/convites";
import { SQL_EMITIR_CONVITE } from "@/lib/gestao/convites-sql";
import { type PapelGestao } from "@/lib/gestao/permissoes";

export async function emitirConvite(formData: FormData): Promise<void> {
  // Rollout fechado até revisão dos grants e testes de segurança.
  if (process.env.GESTAO_HABILITADA !== "true" || process.env.GESTAO_CONVITES_HABILITADOS !== "true") {
    throw new Error("Convites indisponíveis");
  }
  const h = await headers();
  if (!origemPermitida(h.get("origin"), h.get("host"))) throw new Error("Origem não autorizada");
  const usuario = await exigirPermissao("financeiro:gerir");
  if (!usuario || !usuario.papeis.includes("admin")) throw new Error("Sem permissão");
  const identificador = validarUsuarioConvite(String(formData.get("usuario") ?? ""));
  const papel = String(formData.get("papel") ?? "");
  if (!identificador || !(["admin", "comercial", "tecnico"] as PapelGestao[]).includes(papel as PapelGestao)) {
    throw new Error("Dados inválidos");
  }
  const token = criarTokenConvite();
  const rows = await consultar<{ id: string }>(SQL_EMITIR_CONVITE, [
    hashTokenConvite(token), identificador, papel, usuario.id,
  ]);
  if (rows.length !== 1) throw new Error("Não foi possível emitir convite");
  // Não devolver token em URL, logs ou redirecionamento nesta etapa.
  // A entrega confidencial exige canal seguro aprovado; emissão permanece protegida por feature flag.
  redirect("/gestao/convites?estado=registrado");
}
