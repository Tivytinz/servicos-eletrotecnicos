"use server";

import { headers } from "next/headers";
import { hashTokenAceiteCliente } from "@/lib/gestao/aceite-cliente";
import { consultar } from "@/lib/gestao/db";
import { origemConvitePermitida } from "@/lib/gestao/origem-convite";

export type PropostaParaAceite = {
  versao:number; valor_centavos:string; descricao:string; validade_em:string;
};

function habilitado():boolean {
  return process.env.GESTAO_HABILITADA==="true"
    && process.env.GESTAO_ACEITE_CLIENTE_HABILITADO==="true";
}

async function origemOk():Promise<boolean> {
  const h=await headers();
  return origemConvitePermitida(h.get("origin"),h.get("host"),
    process.env.GESTAO_ORIGEM_PUBLICA);
}

export async function visualizarPropostaPeloLink(token:string):Promise<PropostaParaAceite|null> {
  if(!habilitado() || !(await origemOk())) return null;
  const hash=hashTokenAceiteCliente(token);
  if(!hash) return null;
  const [r]=await consultar<{versao:number;valor_centavos:string;descricao:string;validade_em:Date}>(
    "SELECT * FROM gestao.consultar_link_aceite_cliente($1)",[hash],
  );
  if(!r) return null;
  return {versao:r.versao,valor_centavos:String(r.valor_centavos),
    descricao:r.descricao,validade_em:new Date(r.validade_em).toISOString()};
}

export async function responderPropostaPeloLink(
  token:string,resposta:"aprovacao"|"recusa",leu:boolean,
):Promise<boolean> {
  if(!habilitado() || !(await origemOk())) return false;
  const hash=hashTokenAceiteCliente(token);
  if(!hash || !["aprovacao","recusa"].includes(resposta) || leu!==true) return false;
  const [r]=await consultar<{ok:boolean}>(
    "SELECT gestao.responder_link_aceite_cliente($1,$2,$3) AS ok",
    [hash,resposta,leu],
  );
  return r?.ok===true;
}
