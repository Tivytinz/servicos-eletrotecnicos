import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { formatarValorOrcamento } from "@/lib/gestao/orcamentos";
import { temPermissao } from "@/lib/gestao/permissoes";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";
import { prepararOrdemServico } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ordens de Serviço — Gestão interna",
  robots: { index: false, follow: false, noarchive: true },
};

type Candidata = {
  orcamento_id: string; versao: number; cliente_nome: string;
  valor_centavos: string; descricao: string; aprovado_em: Date;
};
type Ordem = {
  id: string; orcamento_id: string; versao: number; cliente_nome: string;
  status: string; valor_centavos: string; criada_em: Date;
};

export default async function OrdensServico({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_OS_PREPARACAO_HABILITADA !== "true") notFound();
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!temPermissao(usuario.papeis, "os:gerir")) redirect("/gestao?erro=sem-permissao");

  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) redirect("/gestao/login");
  const [candidatas, ordens] = await Promise.all([
    consultar<Candidata>("SELECT * FROM gestao.listar_candidatas_os_preparacao_restritas($1)", [token]),
    consultar<Ordem>("SELECT * FROM gestao.listar_os_preparacao_restritas($1)", [token]),
  ]);
  const { erro, sucesso } = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/gestao" className="text-sm font-semibold text-amber-300 hover:underline">
        ← Voltar ao painel
      </Link>
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-400">
          Eletrotécnico GO · Área restrita
        </p>
        <h1 className="mt-2 text-3xl font-bold">Ordens de Serviço — preparação</h1>
        <p className="mt-3 text-slate-300">
          Organize propostas aprovadas internamente para análise operacional.
          A aprovação relatada por um operador <strong>não comprova o aceite do cliente</strong>.
          Nesta etapa, as OS ficam pendentes, sem agendamento, execução, despesas ou cobrança.
        </p>
      </header>
      {sucesso === "preparacao" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Preparação registrada. A ordem permanece pendente de comprovação do aceite do cliente.
        </p>
      )}
      {erro === "conflito" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Não foi possível iniciar a preparação: confira o estado, a versão, a aprovação relatada
          e se já existe uma OS para este orçamento.
        </p>
      )}
      {erro === "dados" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Referência do orçamento inválida.
        </p>
      )}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Propostas para preparação</h2>
        <p className="mt-2 text-sm text-slate-400">
          Apenas propostas aprovadas e não identificadas como teste interno.
          O registro de aprovação é uma declaração do operador, não uma assinatura do cliente.
        </p>
        {candidatas.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-white/20 p-5 text-slate-300">
            Nenhuma proposta apta à preparação. Orçamentos de teste interno não aparecem aqui.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {candidatas.map(o => (
              <li key={o.orcamento_id} className="rounded-2xl border border-white/15 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{o.cliente_nome}</h3>
                    <p className="text-xs text-slate-400">Orçamento versão {o.versao} · aceite relatado</p>
                  </div>
                  <strong>{formatarValorOrcamento(o.valor_centavos)}</strong>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{o.descricao}</p>
                <form action={prepararOrdemServico} className="mt-4">
                  <input type="hidden" name="orcamento" value={o.orcamento_id} />
                  <input type="hidden" name="versao" value={o.versao} />
                  <button className="rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 hover:bg-amber-300">
                    Criar OS pendente de comprovação
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-bold">Ordens em preparação</h2>
        {ordens.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/20 p-5 text-slate-300">
            Ainda não existem ordens de serviço em preparação.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {ordens.map(os => (
              <li key={os.id} className="rounded-2xl border border-amber-400/20 bg-white/[0.03] p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{os.cliente_nome}</h3>
                    <p className="text-xs text-slate-400">Proposta versão {os.versao}</p>
                  </div>
                  <strong>{formatarValorOrcamento(os.valor_centavos)}</strong>
                </div>
                <p className="mt-3 text-sm font-semibold text-amber-200">
                  OS pendente — não autorizada para execução
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Esta etapa não permite agendar, iniciar o trabalho, concluir ou registrar recebimentos.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
