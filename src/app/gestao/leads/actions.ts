"use server";
import { SQL_CADASTRAR_LEAD } from "@/lib/gestao/queries";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";
import { transicaoLeadPermitida } from "@/lib/gestao/transicoes-leads";

const ORIGENS = new Set(["whatsapp", "google_ads", "indicacao", "site", "outro"]);

export async function cadastrarLead(formData: FormData): Promise<void> {
  if (process.env.GESTAO_HABILITADA !== "true") throw new Error("Gestão indisponível");
  if (!(await exigirPermissao("leads:criar"))) throw new Error("Sem permissão");
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const origem = String(formData.get("origem") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (nome.length < 2 || nome.length > 200 || telefone.length > 40
    || descricao.length < 3 || descricao.length > 4000 || !ORIGENS.has(origem)) {
    throw new Error("Dados inválidos");
  }
  // A operação precisa ser atômica: uma instrução SQL cria cliente e lead.
  await consultar(SQL_CADASTRAR_LEAD, [nome, telefone || null, origem, descricao]);
  revalidatePath("/gestao/leads");
  redirect("/gestao/leads");
}

/** Alteração de estado: a action valida sessão e origem, e o banco revalida
 * o próprio token, RBAC, estado esperado e trilha de auditoria.
 * GESTAO_STATUS_HABILITADO fica desativado até aplicar/verificar migration 010.
 */
export async function alterarStatusLead(formData: FormData): Promise<void> {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_STATUS_HABILITADO !== "true") {
    throw new Error("Alteração de status indisponível");
  }
  if (!(await exigirPermissao("leads:atualizar"))) {
    throw new Error("Sem permissão");
  }

  const h = await headers();
  if (!origemConvitePermitida(h.get("origin"), h.get("host"), process.env.GESTAO_ORIGEM_PUBLICA)) {
    throw new Error("Origem não autorizada");
  }
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("Sessão inválida");
  }
  const id = String(formData.get("id") ?? "");
  const atual = String(formData.get("statusAtual") ?? "");
  const proximo = String(formData.get("proximoStatus") ?? "");
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)
    || !transicaoLeadPermitida(atual, proximo)) {
    redirect("/gestao/leads?erro=transicao");
  }

  const [resultado] = await consultar<{ atualizado: boolean }>(
    "SELECT gestao.alterar_status_lead($1,$2::uuid,$3,$4) AS atualizado",
    [token, id, atual, proximo],
  );
  if (!resultado?.atualizado) redirect("/gestao/leads?erro=conflito");

  revalidatePath("/gestao");
  revalidatePath("/gestao/leads");
  redirect("/gestao/leads?sucesso=status");
}
