"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";

/** Abre exclusivamente uma ficha de planejamento, nunca OS executável. */
export async function prepararOrdemServico(formData: FormData): Promise<void> {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_OS_PREPARACAO_HABILITADA !== "true") {
    throw new Error("Planejamento de OS indisponível");
  }
  if (!(await exigirPermissao("os:gerir"))) throw new Error("Sem permissão");
  const h = await headers();
  if (!origemConvitePermitida(h.get("origin"), h.get("host"), process.env.GESTAO_ORIGEM_PUBLICA)) {
    throw new Error("Origem não autorizada");
  }
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Sessão inválida");

  const orcamento = String(formData.get("orcamento") ?? "");
  const versaoTexto = String(formData.get("versao") ?? "");
  const versao = Number(versaoTexto);
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(orcamento)
    || !/^[1-9][0-9]{0,9}$/.test(versaoTexto)
    || !Number.isSafeInteger(versao) || versao >= 2147483647) {
    redirect("/gestao/ordens-servico?erro=dados");
  }

  const [resultado] = await consultar<{ id: string | null }>(
    "SELECT gestao.criar_os_preparacao($1,$2::uuid,$3::integer) AS id",
    [token, orcamento, versao],
  );
  if (!resultado?.id) redirect("/gestao/ordens-servico?erro=conflito");
  revalidatePath("/gestao/ordens-servico");
  redirect("/gestao/ordens-servico?sucesso=preparacao");
}


/** Atribui técnico e data prevista à OS PENDENTE; não agenda nem autoriza execução. */
export async function planejarOrdemPendente016(formData: FormData): Promise<void> {
  if(process.env.GESTAO_HABILITADA!=="true"
    ||process.env.GESTAO_OS_PREPARACAO_HABILITADA!=="true"
    ||process.env.GESTAO_OS_PLANEJAMENTO_HABILITADO!=="true")
    throw new Error("Planejamento indisponível");
  const usuario=await exigirPermissao("os:gerir");
  if(!usuario?.papeis.includes("admin")) throw new Error("Sem permissão");
  const h=await headers();
  if(!origemConvitePermitida(h.get("origin"),h.get("host"),process.env.GESTAO_ORIGEM_PUBLICA))
    throw new Error("Origem não autorizada");
  const token=(await cookies()).get(COOKIE_SESSAO)?.value;
  if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Sessão inválida");
  const os=String(formData.get("os")??"");
  const tecnico=String(formData.get("tecnico")??"");
  const data=String(formData.get("data_prevista")??"");
  const observacao=String(formData.get("observacao")??"");
  const revisaoTexto=String(formData.get("revisao")??"");
  const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  if(!uuid.test(os)||!uuid.test(tecnico)
    ||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(data)
    ||!/^(0|[1-9][0-9]{0,9})$/.test(revisaoTexto)
    ||Number(revisaoTexto)>2147483645||observacao.length>500)
    redirect("/gestao/ordens-servico?erro=dados");
  const [r]=await consultar<{ok:boolean}>(
    "SELECT gestao.planejar_os_pendente_016($1,$2::uuid,$3::uuid,$4::date,$5,$6::integer) AS ok",
    [token,os,tecnico,data,observacao,Number(revisaoTexto)],
  );
  if(!r?.ok) redirect("/gestao/ordens-servico?erro=planejamento");
  revalidatePath("/gestao/ordens-servico");
  redirect("/gestao/ordens-servico?sucesso=planejamento");
}
