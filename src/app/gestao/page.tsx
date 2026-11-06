import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import {
  SQL_RESUMO_GESTAO,
  SQL_SOLICITACOES_RECENTES,
  rotuloOrigemLead,
  rotuloStatusLead,
  type ResumoGestao,
  type SolicitacaoRecente,
} from "@/lib/gestao/painel";
import { temPermissao } from "@/lib/gestao/permissoes";
import { sair } from "./login/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Painel operacional — Gestão interna",
  robots: { index: false, follow: false, noarchive: true },
};

const DATA_BR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

function rotuloTempo(valor: Date | string) {
  return DATA_BR.format(new Date(valor));
}

function estiloStatus(status: string): string {
  switch (status) {
    case "novo": return "bg-amber-400/10 text-amber-200 border-amber-400/30";
    case "qualificado": return "bg-sky-400/10 text-sky-200 border-sky-400/30";
    case "orcamento_em_preparo":
    case "orcamento_enviado": return "bg-indigo-400/10 text-indigo-200 border-indigo-400/30";
    case "aprovado": return "bg-emerald-400/10 text-emerald-200 border-emerald-400/30";
    default: return "bg-white/5 text-slate-300 border-white/15";
  }
}

export default async function Gestao({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (process.env.GESTAO_HABILITADA !== "true") redirect("/");
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");

  const podeVerSolicitacoes = temPermissao(usuario.papeis, "leads:ler");
  const podeCadastrar = temPermissao(usuario.papeis, "leads:criar");
  const podeOrcamentar = process.env.GESTAO_ORCAMENTOS_HABILITADOS === "true"
    && temPermissao(usuario.papeis, "orcamentos:gerir");
  const podePrepararOS = process.env.GESTAO_OS_PREPARACAO_HABILITADA === "true"
    && temPermissao(usuario.papeis, "os:gerir");
  const podeConvidar = process.env.GESTAO_CONVITES_HABILITADOS === "true"
    && usuario.papeis.includes("admin");
  // Consulta somente depois da validação da sessão e do RBAC; não retorna
  // dados operacionais a usuários que não possuam a permissão de leitura.
  const [resumo, recentes] = podeVerSolicitacoes
    ? await Promise.all([
        consultar<ResumoGestao>(SQL_RESUMO_GESTAO),
        consultar<SolicitacaoRecente>(SQL_SOLICITACOES_RECENTES),
      ])
    : [[], []];

  const indicadores = resumo[0];
  const { erro } = await searchParams;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            Eletrotécnico GO · Área restrita
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Painel operacional</h1>
          <p className="mt-2 text-slate-300">Olá, {usuario.nome}. Acompanhe seus atendimentos e próximos passos.</p>
        </div>
        <form action={sair}>
          <button className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:border-amber-400/50 hover:bg-white/5">
            Sair com segurança
          </button>
        </form>
      </header>

      {erro === "sem-permissao" && (
        <p role="alert" className="mt-7 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Acesso negado: seu perfil não possui permissão para essa área.
        </p>
      )}

      {podeVerSolicitacoes && indicadores ? (
        <>
          <section aria-labelledby="indicadores-titulo" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="indicadores-titulo" className="text-lg font-bold">Visão geral</h2>
              <p className="text-xs text-slate-400">Dados reais do cadastro · atualizados ao abrir</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Clientes cadastrados", valor: indicadores.clientes, detalhe: "Registros de clientes" },
                { label: "Solicitações", valor: indicadores.solicitacoes, detalhe: "Total recebido" },
                { label: "Aguardando triagem", valor: indicadores.novas, detalhe: "Solicitações com status novo" },
                { label: "Em orçamento", valor: indicadores.em_orcamento, detalhe: "Em preparo ou enviado" },
              ].map((item) => (
                <article key={item.label} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 sm:p-5">
                  <h3 className="text-xs font-semibold text-slate-300 sm:text-sm">{item.label}</h3>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-white sm:text-4xl">{item.valor}</p>
                  <p className="mt-2 text-xs text-slate-400">{item.detalhe}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
            <section aria-labelledby="solicitacoes-titulo" className="min-w-0 rounded-2xl border border-white/15 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="solicitacoes-titulo" className="text-lg font-bold">Últimas solicitações</h2>
                  <p className="mt-1 text-sm text-slate-400">Os cinco atendimentos mais recentes.</p>
                </div>
                <Link href="/gestao/leads" className="text-sm font-semibold text-amber-300 hover:underline">
                  Ver todas →
                </Link>
              </div>
              {recentes.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/20 p-6">
                  <p className="font-semibold">Nenhuma solicitação cadastrada.</p>
                  <p className="mt-2 text-sm text-slate-400">Quando chegar um pedido, registre-o para começar o acompanhamento.</p>
                  {podeCadastrar && (
                    <Link href="/gestao/leads#nova-solicitacao" className="mt-4 inline-block rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950">
                      Registrar primeiro pedido
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-white/10">
                  {recentes.map((lead) => (
                    <li key={lead.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">{lead.nome}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${estiloStatus(lead.status)}`}>
                          {rotuloStatusLead(lead.status)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">{lead.descricao}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {rotuloOrigemLead(lead.origem)} · {rotuloTempo(lead.criado_em)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-6">
              <section aria-labelledby="acoes-titulo" className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 sm:p-6">
                <h2 id="acoes-titulo" className="text-lg font-bold">Ações rápidas</h2>
                <div className="mt-5 flex flex-col gap-3">
                  {podeCadastrar && (
                    <Link href="/gestao/leads#nova-solicitacao" className="rounded-xl bg-amber-400 px-4 py-3 text-center font-bold text-slate-950 hover:bg-amber-300">
                      + Registrar solicitação
                    </Link>
                  )}
                  <Link href="/gestao/leads" className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold hover:bg-white/5">
                    Consultar clientes e pedidos
                  </Link>
                  {podeOrcamentar && (
                    <Link href="/gestao/orcamentos" className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold hover:bg-white/5">
                      Preparar orçamentos
                    </Link>
                  )}
                  {podePrepararOS && (
                    <Link href="/gestao/ordens-servico" className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold hover:bg-white/5">
                      {process.env.GESTAO_OS_PLANEJAMENTO_HABILITADO === "true" ? "Ordens de Serviço — planejamento" : "Ordens de Serviço — preparação"}
                    </Link>
                  )}
                  {podeConvidar && (
                    <Link href="/gestao/convites" className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold hover:bg-white/5">
                      Gerenciar convites da equipe
                    </Link>
                  )}
                </div>
              </section>
              <section aria-labelledby="andamento-titulo" className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 sm:p-6">
                <h2 id="andamento-titulo" className="text-lg font-bold">Andamento comercial</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-300">Qualificadas</dt><dd className="font-semibold tabular-nums">{indicadores.qualificadas}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-300">Orçamentos em andamento</dt><dd className="font-semibold tabular-nums">{indicadores.em_orcamento}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-300">Aprovadas</dt><dd className="font-semibold tabular-nums">{indicadores.aprovadas}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-slate-400">Contagens por status da solicitação, não representam faturamento.</p>
              </section>
            </div>
          </div>
        </>
      ) : (
        <section className="mt-10 rounded-2xl border border-white/15 p-6">
          <h2 className="text-lg font-bold">Acesso à gestão</h2>
          <p className="mt-2 text-slate-300">
            Seu perfil não possui permissão para visualizar as solicitações da empresa.
          </p>
          {podeConvidar && (
            <Link href="/gestao/convites" className="mt-4 inline-block font-semibold text-amber-300 hover:underline">
              Gerenciar convites da equipe →
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
