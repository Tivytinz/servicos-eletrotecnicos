import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { temPermissao } from "@/lib/gestao/permissoes";
import { consultar } from "@/lib/gestao/db";
import { cadastrarLead } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Solicitações", robots: { index: false, follow: false } };

type Lead = {
  id: string; nome: string; telefone: string | null;
  origem: string; descricao: string; status: string; criado_em: Date;
};

export default async function Leads() {
  if (process.env.GESTAO_HABILITADA !== "true") notFound();
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!temPermissao(usuario.papeis, "leads:ler")) redirect("/gestao?erro=sem-permissao");
  const leads = await consultar<Lead>(`
    SELECT l.id, c.nome, c.telefone, l.origem, l.descricao, l.status, l.criado_em
    FROM gestao.leads l JOIN gestao.clientes c ON c.id = l.cliente_id
    ORDER BY l.criado_em DESC LIMIT 100
  `);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <a href="/gestao" className="text-amber-300">← Painel</a>
      <h1 className="mt-6 text-3xl font-bold">Solicitações e clientes</h1>
      <p className="mt-2 text-slate-300">Cadastre pedidos recebidos pelo WhatsApp, site ou indicação.</p>
      <form action={cadastrarLead} className="mt-8 grid gap-4 rounded-xl border border-white/15 bg-white/5 p-6">
        <label>Cliente <input name="nome" required minLength={2} maxLength={200}
          className="mt-2 block w-full rounded-lg bg-slate-900 p-3" /></label>
        <label>Telefone <input name="telefone" maxLength={40}
          className="mt-2 block w-full rounded-lg bg-slate-900 p-3" /></label>
        <label>Origem
          <select name="origem" className="mt-2 block w-full rounded-lg bg-slate-900 p-3">
            <option value="whatsapp">WhatsApp</option><option value="google_ads">Google Ads</option>
            <option value="indicacao">Indicação</option><option value="site">Site</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label>Descrição <textarea name="descricao" required minLength={3} maxLength={4000}
          className="mt-2 block min-h-24 w-full rounded-lg bg-slate-900 p-3" /></label>
        <button className="rounded-lg bg-amber-400 p-3 font-bold text-slate-950">Registrar solicitação</button>
      </form>
      <h2 className="mt-10 text-xl font-bold">Últimas solicitações</h2>
      <div className="mt-4 space-y-3">
        {leads.length === 0 && <p className="text-slate-300">Nenhuma solicitação cadastrada.</p>}
        {leads.map((lead) => (
          <article key={lead.id} className="rounded-xl border border-white/15 p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">{lead.nome}</h3>
              <span className="text-sm text-slate-300">{lead.status}</span>
            </div>
            <p className="mt-2 text-slate-300">{lead.descricao}</p>
            <p className="mt-3 text-sm text-slate-400">{lead.telefone || "Sem telefone"} · {lead.origem}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
