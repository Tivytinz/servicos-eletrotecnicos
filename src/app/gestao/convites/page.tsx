import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { emitirConvite } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Convites da equipe", robots: { index: false, follow: false } };

export default async function Convites() {
  if (process.env.GESTAO_HABILITADA !== "true" || process.env.GESTAO_CONVITES_HABILITADOS !== "true") redirect("/");
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!usuario.papeis.includes("admin")) redirect("/gestao?erro=sem-permissao");
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <a href="/gestao" className="text-amber-300">← Voltar à gestão</a>
      <h1 className="mt-5 text-3xl font-bold">Convidar integrante da equipe</h1>
      <p className="mt-3 text-slate-300">A emissão está em implantação controlada. Convites não são enviados automaticamente.</p>
      <form action={emitirConvite} className="mt-8 space-y-5 rounded-xl border border-white/15 p-6">
        <label className="block">Usuário
          <input name="usuario" required minLength={3} maxLength={32} pattern="[a-z][a-z0-9_.-]{2,31}"
            autoComplete="off" className="mt-2 w-full rounded-lg bg-slate-900 p-3" />
        </label>
        <label className="block">Perfil de acesso
          <select name="papel" required className="mt-2 w-full rounded-lg bg-slate-900 p-3">
            <option value="tecnico">Técnico</option>
            <option value="comercial">Comercial</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950">Preparar convite</button>
      </form>
    </main>
  );
}
