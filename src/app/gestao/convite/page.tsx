import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FormularioAceite from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Aceitar convite — Eletrotécnico GO",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default function PaginaAceite() {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_CONVITES_HABILITADOS !== "true") redirect("/");
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-400">Eletrotécnico GO</p>
      <h1 className="mt-3 text-3xl font-bold">Aceitar convite</h1>
      <p className="mt-3 text-slate-300">Defina sua senha pessoal para acessar a gestão interna.</p>
      <FormularioAceite />
    </main>
  );
}
