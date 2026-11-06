import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FormularioAceiteCliente from "./form";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:"Confirmação de proposta — Eletrotécnico GO",
  robots:{index:false,follow:false,noarchive:true},
  referrer:"no-referrer",
};

export default function PaginaConfirmacaoProposta() {
  if(process.env.GESTAO_HABILITADA!=="true"
    ||process.env.GESTAO_ACEITE_CLIENTE_HABILITADO!=="true")notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Eletrotécnico GO</p>
      <h1 className="mt-4 text-3xl font-bold">Confirmação de proposta</h1>
      <p className="mt-3 text-slate-300">
        Confira os detalhes do orçamento e informe se concorda com a versão apresentada.
        Essa página não realiza cobranças nem agenda serviços automaticamente.
      </p>
      <FormularioAceiteCliente />
    </main>
  );
}
