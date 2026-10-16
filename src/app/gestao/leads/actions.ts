"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";

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
  await consultar(`
    WITH cliente AS (
      INSERT INTO gestao.clientes (nome, telefone) VALUES ($1, $2)
      RETURNING id
    )
    INSERT INTO gestao.leads (cliente_id, origem, descricao)
    SELECT id, $3, $4 FROM cliente
  `, [nome, telefone || null, origem, descricao]);
  revalidatePath("/gestao/leads");
  redirect("/gestao/leads");
}
