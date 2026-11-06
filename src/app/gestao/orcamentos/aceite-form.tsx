"use client";

import { useActionState } from "react";
import { emitirLinkAceiteCliente, type EstadoLinkCliente } from "./aceite-actions";

const INICIAL: EstadoLinkCliente = {erro:null,link:null};

export default function FormularioLinkCliente({orcamento,versao}:{
  orcamento:string; versao:number;
}) {
  const [estado,action,pendente]=useActionState(emitirLinkAceiteCliente,INICIAL);
  return (
    <div className="mt-4">
      <form action={action}>
        <input type="hidden" name="orcamento" value={orcamento}/>
        <input type="hidden" name="versao" value={versao}/>
        <button disabled={pendente}
          className="rounded-lg bg-amber-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
          {pendente?"Gerando link privado...":"Gerar link de confirmação (24h)"}
        </button>
      </form>
      {estado.erro&&<p role="alert" className="mt-3 text-sm text-rose-300">{estado.erro}</p>}
      {estado.link&&(
        <div className="mt-4 rounded-lg border border-emerald-400/40 p-4">
          <strong className="text-emerald-200">Link gerado — exibido apenas uma vez</strong>
          <p className="mt-2 text-sm text-slate-300">
            Copie e encaminhe privadamente ao cliente pelo canal correto.
            Confirme o destinatário antes do envio. O sistema não envia mensagens.
            Reemitir revoga o link anterior; qualquer pessoa com este link pode responder.
          </p>
          <label className="mt-3 block text-sm">
            Link privado
            <input readOnly value={estado.link} onFocus={e=>e.currentTarget.select()}
              className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-sm"/>
          </label>
          <button type="button" onClick={()=>void navigator.clipboard.writeText(estado.link!)}
            className="mt-3 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-200">
            Copiar link
          </button>
        </div>
      )}
    </div>
  );
}
