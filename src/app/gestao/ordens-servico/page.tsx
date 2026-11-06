import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { formatarValorOrcamento } from "@/lib/gestao/orcamentos";
import { temPermissao } from "@/lib/gestao/permissoes";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";
import { planejarOrdemPendente016, prepararOrdemServico } from "./actions";

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
  tecnico_id?: string | null; tecnico_nome?: string | null;
  data_prevista?: string | Date | null; observacao?: string | null;
  revisao?: number;
};
type Tecnico={id:string;nome:string};

function diaISO(data:string|Date|null|undefined):string {
  if(!data)return "";
  return typeof data==="string"?data.slice(0,10):data.toISOString().slice(0,10);
}
function diaBR(data:string|Date|null|undefined):string {
  const iso=diaISO(data);
  return iso?new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(iso+"T12:00:00Z")):"Não definida";
}
const hojeSP=new Intl.DateTimeFormat("en-CA",{
  timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",
}).format(new Date());

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
  const planejamentoAtivo=process.env.GESTAO_OS_PLANEJAMENTO_HABILITADO==="true";
  const admin=usuario.papeis.includes("admin");
  const [candidatas,ordens,tecnicos]=await Promise.all([
    consultar<Candidata>("SELECT * FROM gestao.listar_candidatas_os_preparacao_restritas($1)",[token]),
    planejamentoAtivo
      ? consultar<Ordem>("SELECT * FROM gestao.listar_os_planejamento_016($1)",[token])
      : consultar<Ordem>("SELECT * FROM gestao.listar_os_preparacao_restritas($1)",[token]),
    planejamentoAtivo && admin
      ? consultar<Tecnico>("SELECT * FROM gestao.listar_tecnicos_os_016($1)",[token])
      : Promise.resolve([] as Tecnico[]),
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
        <h1 className="mt-2 text-3xl font-bold">
          Ordens de Serviço — {planejamentoAtivo?"planejamento":"preparação"}
        </h1>
        <p className="mt-3 text-slate-300">
          Organize propostas aprovadas internamente para análise operacional.
          A aprovação relatada por um operador <strong>não comprova o aceite do cliente</strong>.
          {planejamentoAtivo
            ? " O administrador pode indicar um técnico e uma data prevista, mas a OS continua pendente, sem agendamento confirmado, execução ou cobrança."
            : " Nesta etapa, as OS ficam pendentes, sem agendamento, execução, despesas ou cobrança."}
        </p>
      </header>
      {sucesso === "preparacao" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Preparação registrada. A ordem permanece pendente de comprovação do aceite do cliente.
        </p>
      )}
      {sucesso === "planejamento" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Planejamento registrado. A data é apenas uma previsão e a OS continua pendente.
        </p>
      )}
      {erro === "planejamento" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Planejamento não salvo. Confira a data, o técnico ativo e se houve outra alteração.
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
                  Esta etapa não permite confirmar agendamento, iniciar o trabalho, concluir ou registrar recebimentos.
                </p>
                {planejamentoAtivo && (
                  <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.02] p-4">
                    <h4 className="font-semibold">Planejamento interno</h4>
                    <p className="mt-2 text-sm text-slate-300">
                      Técnico: <strong>{os.tecnico_nome??"Não atribuído"}</strong> ·
                      Data prevista: <strong>{diaBR(os.data_prevista)}</strong>
                    </p>
                    {os.observacao&&<p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-400">{os.observacao}</p>}
                    {admin && (tecnicos.length>0 ? (
                      <form action={planejarOrdemPendente016} className="mt-4 grid gap-4 sm:grid-cols-2">
                        <input type="hidden" name="os" value={os.id}/>
                        <input type="hidden" name="revisao" value={os.revisao??0}/>
                        <label className="text-sm text-slate-200">Técnico responsável
                          <select name="tecnico" required defaultValue={os.tecnico_id??""}
                            className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3">
                            <option value="" disabled>Escolha um técnico</option>
                            {tecnicos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                        </label>
                        <label className="text-sm text-slate-200">Dia previsto (não confirmado)
                          <input type="date" name="data_prevista" required min={hojeSP}
                            defaultValue={diaISO(os.data_prevista)}
                            className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
                        </label>
                        <label className="text-sm text-slate-200 sm:col-span-2">Observações internas
                          <textarea name="observacao" rows={2} maxLength={500}
                            defaultValue={os.observacao??""}
                            className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3"/>
                        </label>
                        <div className="sm:col-span-2">
                          <button className="rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 hover:bg-amber-300">
                            Salvar planejamento
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-3 text-sm text-amber-200">
                        Nenhum técnico ativo cadastrado. Cadastre um usuário com papel técnico para atribuir.
                      </p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
