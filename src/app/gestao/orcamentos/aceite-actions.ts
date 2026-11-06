"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/gestao/acesso";
import { criarTokenAceiteCliente, hashTokenAceiteCliente } from "@/lib/gestao/aceite-cliente";
import { consultar } from "@/lib/gestao/db";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";

export type EstadoLinkCliente = { erro: string | null; link: string | null };
const INDISPONIVEL = "Não foi possível emitir o link. Confira a versão, o envio e a validade.";

function dadosOrcamento(formData: FormData): { id: string; versao: number } | null {
  const id=String(formData.get("orcamento")??"");
  const texto=String(formData.get("versao")??"");
  const versao=Number(texto);
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)
    || !/^[1-9][0-9]{0,9}$/.test(texto)
    || !Number.isSafeInteger(versao) || versao>=2147483647) return null;
  return {id,versao};
}

function habilitado(): boolean {
  return process.env.GESTAO_HABILITADA==="true"
    && process.env.GESTAO_ORCAMENTOS_HABILITADOS==="true"
    && process.env.GESTAO_ACEITE_CLIENTE_HABILITADO==="true";
}

async function sessaoOperador(): Promise<string|null> {
  if(!(await exigirPermissao("orcamentos:gerir"))) return null;
  const token=(await cookies()).get(COOKIE_SESSAO)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

async function origemOk(): Promise<string|null> {
  const h=await headers();
  const origem=h.get("origin");
  return origemConvitePermitida(origem,h.get("host"),process.env.GESTAO_ORIGEM_PUBLICA)
    ? origem : null;
}

export async function emitirLinkAceiteCliente(
  _anterior: EstadoLinkCliente,formData: FormData,
): Promise<EstadoLinkCliente> {
  void _anterior;
  if(!habilitado()) return {erro:"Confirmação por link indisponível.",link:null};
  const [sessao,origem]=await Promise.all([sessaoOperador(),origemOk()]);
  if(!sessao || !origem) return {erro:"Acesso ou origem não autorizados.",link:null};
  const entrada=dadosOrcamento(formData);
  if(!entrada) return {erro:"Referência de proposta inválida.",link:null};
  const token=criarTokenAceiteCliente();
  const hash=hashTokenAceiteCliente(token);
  if(!hash) return {erro:INDISPONIVEL,link:null};

  const [r]=await consultar<{id:string|null}>(
    "SELECT gestao.emitir_link_aceite_cliente($1,$2::uuid,$3::integer,$4) AS id",
    [sessao,entrada.id,entrada.versao,hash],
  );
  if(!r?.id) return {erro:INDISPONIVEL,link:null};
  revalidatePath("/gestao/orcamentos");
  // Fragmento #token não é enviado no GET, no Referer ou em logs HTTP.
  // Não armazenar link no banco, analytics nem query string.
  return {erro:null,link:`${origem}/proposta/aceite#${token}`};
}

export async function revogarLinkAceiteCliente(formData:FormData):Promise<void> {
  if(!habilitado()) throw new Error("Funcionalidade indisponível");
  const [sessao,origem]=await Promise.all([sessaoOperador(),origemOk()]);
  if(!sessao||!origem) throw new Error("Acesso não autorizado");
  const entrada=dadosOrcamento(formData);
  if(!entrada) redirect("/gestao/orcamentos?erro=dados");
  const [r]=await consultar<{ok:boolean}>(
    "SELECT gestao.revogar_link_aceite_cliente($1,$2::uuid,$3::integer) AS ok",
    [sessao,entrada.id,entrada.versao],
  );
  if(!r?.ok) redirect("/gestao/orcamentos?erro=conflito");
  revalidatePath("/gestao/orcamentos");
  redirect("/gestao/orcamentos?sucesso=link-revogado");
}
