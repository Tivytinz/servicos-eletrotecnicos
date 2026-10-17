import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import FormularioConvite from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Convites da equipe",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function Convites() {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_CONVITES_HABILITADOS !== "true") redirect("/");
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!usuario.papeis.includes("admin")) redirect("/gestao?erro=sem-permissao");
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <a href="/gestao" className="text-amber-300">← Voltar à gestão</a>
      <h1 className="mt-5 text-3xl font-bold">Convidar integrante da equipe</h1>
      <p className="mt-3 text-slate-300">
        Defina o login e o perfil. Compartilhe o link privado para a pessoa criar sua própria senha.
      </p>
      <FormularioConvite />
    </main>
  );
}
