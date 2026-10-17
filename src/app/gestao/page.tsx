import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { temPermissao } from "@/lib/gestao/permissoes";
import { sair } from "./login/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Gestão interna",
  robots: { index: false, follow: false },
};

export default async function Gestao({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (process.env.GESTAO_HABILITADA !== "true") redirect("/");
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  const { erro } = await searchParams;
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-400">Eletrotécnico GO</p>
          <h1 className="mt-2 text-3xl font-bold">Gestão de serviços</h1>
          <p className="mt-2 text-slate-300">Olá, {usuario.nome}.</p>
        </div>
        <form action={sair}>
          <button className="rounded-lg border border-white/20 px-5 py-3">Sair</button>
        </form>
      </div>
      {erro === "sem-permissao" && (
        <p role="alert" className="mt-8 rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-amber-200">
          Acesso negado: seu perfil não possui permissão para essa área.
        </p>
      )}
      {temPermissao(usuario.papeis, "leads:ler") ? (
        <a href="/gestao/leads" className="mt-10 block rounded-xl border border-white/15 bg-white/5 p-6 font-bold hover:border-amber-400">
          Clientes e solicitações →
        </a>
      ) : (
        <p className="mt-10 text-slate-300">Seu acesso não inclui o cadastro comercial.</p>
      )}
    </main>
  );
}
