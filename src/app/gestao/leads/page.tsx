import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { temPermissao } from "@/lib/gestao/permissoes";
import { consultar } from "@/lib/gestao/db";
import { rotuloOrigemLead, rotuloStatusLead } from "@/lib/gestao/painel";
import { proximosStatusLead } from "@/lib/gestao/transicoes-leads";
import { alterarStatusLead, cadastrarLead } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Solicitações e clientes",
  robots: { index: false, follow: false, noarchive: true },
};

type Lead = {
  id: string; nome: string; telefone: string | null;
  origem: string; descricao: string; status: string; criado_em: Date;
};

export default async function Leads({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  if (process.env.GESTAO_HABILITADA !== "true") notFound();
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!temPermissao(usuario.papeis, "leads:ler")) redirect("/gestao?erro=sem-permissao");

  const podeOrcamentar = process.env.GESTAO_ORCAMENTOS_HABILITADOS === "true"
    && temPermissao(usuario.papeis, "orcamentos:gerir");
  const podeAtualizar = process.env.GESTAO_STATUS_HABILITADO === "true"
    && temPermissao(usuario.papeis, "leads:atualizar");
  const { erro, sucesso } = await searchParams;
  const leads = await consultar<Lead>(`
    SELECT l.id, c.nome, c.telefone, l.origem, l.descricao, l.status, l.criado_em
    FROM gestao.leads l JOIN gestao.clientes c ON c.id = l.cliente_id
    ORDER BY l.criado_em DESC, l.id DESC LIMIT 100
  `);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <a href="/gestao" className="text-amber-300 hover:underline">← Voltar ao painel</a>
      <div className="mt-6">
        <h1 className="text-3xl font-bold">Solicitações e clientes</h1>
        <p className="mt-2 text-slate-300">Registre pedidos recebidos pelo WhatsApp, site ou indicação e acompanhe cada etapa do atendimento.</p>
      </div>
      {sucesso === "status" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Etapa atualizada e registrada no histórico de auditoria.
        </p>
      )}
      {erro === "conflito" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Não foi possível alterar. A solicitação pode ter mudado ou sua sessão expirou. Atualize a página e tente novamente.
        </p>
      )}
      {erro === "transicao" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Transição não permitida. Confira a etapa atual.
        </p>
      )}
      {temPermissao(usuario.papeis, "leads:criar") ? (
        <form id="nova-solicitacao" action={cadastrarLead} className="mt-8 scroll-mt-8 grid gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-6 sm:grid-cols-2">
          <h2 className="text-lg font-bold sm:col-span-2">Registrar nova solicitação</h2>
          <label className="block text-sm">Cliente
            <input name="nome" required minLength={2} maxLength={200}
              className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
          </label>
          <label className="block text-sm">Telefone
            <input name="telefone" type="tel" maxLength={40}
              className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
          </label>
          <label className="block text-sm">Origem
            <select name="origem" className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3">
              <option value="whatsapp">WhatsApp</option><option value="google_ads">Google Ads</option>
              <option value="indicacao">Indicação</option><option value="site">Site</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">Descrição
            <textarea name="descricao" required minLength={3} maxLength={4000}
              className="mt-2 block min-h-24 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300">
              Registrar solicitação
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-8 rounded-lg border border-white/15 p-4 text-slate-300">
          Seu perfil pode consultar solicitações, mas não cadastrar novas.
        </p>
      )}

      <section className="mt-10" aria-labelledby="lista-solicitacoes">
        <h2 id="lista-solicitacoes" className="text-xl font-bold">Últimas solicitações</h2>
        <p className="mt-1 text-sm text-slate-400">Até 100 registros mais recentes. Os indicadores do painel acompanham o status cadastrado.</p>
        <div className="mt-5 space-y-4">
          {leads.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/20 p-6 text-slate-300">
              Nenhuma solicitação cadastrada.
            </p>
          )}
          {leads.map((lead) => {
            const proximos = proximosStatusLead(lead.status);
            return (
              <article key={lead.id} className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <h3 className="text-lg font-bold">{lead.nome}</h3>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                    {rotuloStatusLead(lead.status)}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-slate-300">{lead.descricao}</p>
                <p className="mt-3 text-sm text-slate-400">
                  {lead.telefone || "Sem telefone"} · {rotuloOrigemLead(lead.origem)}
                </p>
                {podeOrcamentar && ["qualificado", "orcamento_em_preparo"].includes(lead.status) && (
                  <a href={`/gestao/orcamentos?lead=${encodeURIComponent(lead.id)}#criar-orcamento`}
                    className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:underline">
                    Preparar orçamento para este atendimento →
                  </a>
                )}
                {podeAtualizar && proximos.length > 0 && (
                  <form action={alterarStatusLead} className="mt-5 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
                    <input type="hidden" name="id" value={lead.id} />
                    <input type="hidden" name="statusAtual" value={lead.status} />
                    <label className="min-w-52 flex-1 text-sm">
                      Próxima etapa
                      <select name="proximoStatus" required defaultValue={proximos[0]}
                        className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3">
                        {proximos.map(status => (
                          <option key={status} value={status}>{rotuloStatusLead(status)}</option>
                        ))}
                      </select>
                    </label>
                    <button className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300">
                      Atualizar etapa
                    </button>
                  </form>
                )}
                {podeAtualizar && proximos.length === 0 && (
                  <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-400">
                    Etapa finalizada. Não há transição automática disponível.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
