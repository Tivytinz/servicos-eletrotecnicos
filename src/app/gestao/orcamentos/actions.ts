"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";
import { dataISOValida, parseValorOrcamento } from "@/lib/gestao/orcamentos";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";

export async function criarOrcamentoRascunho(formData: FormData): Promise<void> {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_ORCAMENTOS_HABILITADOS !== "true") {
    throw new Error("Orçamentos indisponíveis");
  }
  if (!(await exigirPermissao("orcamentos:gerir"))) throw new Error("Sem permissão");

  const h = await headers();
  if (!origemConvitePermitida(h.get("origin"), h.get("host"), process.env.GESTAO_ORIGEM_PUBLICA)) {
    throw new Error("Origem não autorizada");
  }
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Sessão inválida");

  const lead = String(formData.get("lead") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const validade = String(formData.get("validade") ?? "");
  const centavos = parseValorOrcamento(String(formData.get("valor") ?? ""));

  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(lead)
    || descricao.length < 10 || descricao.length > 4000
    || !centavos || !dataISOValida(validade)) {
    redirect("/gestao/orcamentos?erro=dados");
  }

  const [resultado] = await consultar<{ id: string | null }>(
    "SELECT gestao.criar_orcamento_rascunho($1,$2::uuid,$3::bigint,$4,$5::date) AS id",
    [token, lead, centavos.toString(), descricao, validade],
  );
  if (!resultado?.id) redirect("/gestao/orcamentos?erro=conflito");

  revalidatePath("/gestao");
  revalidatePath("/gestao/leads");
  revalidatePath("/gestao/orcamentos");
  redirect("/gestao/orcamentos?sucesso=rascunho");
}
