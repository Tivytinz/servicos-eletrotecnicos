import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { entrar } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Acesso à gestão",
  robots: { index: false, follow: false },
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (process.env.GESTAO_HABILITADA !== "true") {
    redirect("/");
  }
  if (await usuarioAtual()) redirect("/gestao");
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="mb-3 text-3xl font-bold text-amber-400">Gestão interna</h1>
      <p className="mb-8 text-slate-300">Acesso exclusivo à equipe do Eletrotécnico GO.</p>
      <form action={entrar} className="space-y-5 rounded-2xl border border-white/15 bg-white/5 p-6">
        <div>
          <label htmlFor="identificador" className="mb-2 block">Usuário</label>
          <input id="identificador" name="identificador" type="text" autoComplete="username" required
            minLength={3} maxLength={254} className="w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
        </div>
        <div>
          <label htmlFor="senha" className="mb-2 block">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="current-password"
            required minLength={12} maxLength={1024}
            className="w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
        </div>
        {erro === "credenciais" && <p role="alert" className="text-rose-300">Não foi possível entrar.</p>}
        <button className="w-full rounded-lg bg-amber-400 p-3 font-bold text-slate-950">Entrar</button>
      </form>
    </main>
  );
}
