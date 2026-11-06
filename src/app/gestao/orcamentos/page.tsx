import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import {
  formatarValidadeOrcamento, formatarValorOrcamento,
  validadeOrcamentoParaEntrada, valorOrcamentoParaEntrada, type OrcamentoResumo,
} from "@/lib/gestao/orcamentos";
import { temPermissao } from "@/lib/gestao/permissoes";
import { COOKIE_SESSAO } from "@/lib/gestao/sessao";
import { criarOrcamentoRascunho, revisarOrcamentoRascunho, registrarEventoOrcamento } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Orçamentos — Gestão interna",
  robots: { index: false, follow: false, noarchive: true },
};

type LeadApto = { id: string; nome: string; descricao: string; status: string };
type EventoOrcamento = {
  orcamento_id: string; versao: number;
  tipo: "envio" | "aprovacao" | "recusa";
  canal: string; evidencia: string; criado_em: Date;
};

export default async function Orcamentos({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; erro?: string; sucesso?: string }>;
}) {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_ORCAMENTOS_HABILITADOS !== "true") notFound();
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!temPermissao(usuario.papeis, "orcamentos:gerir")) redirect("/gestao?erro=sem-permissao");

  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) redirect("/gestao/login");

  const eventosHabilitados = process.env.GESTAO_ORCAMENTOS_EVENTOS_HABILITADOS === "true";
  const [orcamentos, elegiveis, eventos] = await Promise.all([
    consultar<OrcamentoResumo>(
      "SELECT * FROM gestao.listar_orcamentos_restritos($1)", [token],
    ),
    consultar<LeadApto>(`
      SELECT l.id, c.nome, l.descricao, l.status
      FROM gestao.leads l
      JOIN gestao.clientes c ON c.id=l.cliente_id
      WHERE l.status IN ('qualificado','orcamento_em_preparo')
      ORDER BY l.criado_em DESC, l.id DESC LIMIT 100
    `),
    eventosHabilitados
      ? consultar<EventoOrcamento>(
          "SELECT * FROM gestao.listar_eventos_orcamento_restritos($1)", [token],
        )
      : Promise.resolve([] as EventoOrcamento[]),
  ]);

  const comOrcamento = new Set(orcamentos.map(o => o.lead_id));
  const semRascunho = elegiveis.filter(l => !comOrcamento.has(l.id));
  const revisaoHabilitada = process.env.GESTAO_ORCAMENTOS_REVISAO_HABILITADA === "true";
  const { lead: selecionado, erro, sucesso } = await searchParams;
  const principal = semRascunho.find(l => l.id === selecionado)?.id ?? semRascunho[0]?.id;

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/gestao" className="text-sm font-semibold text-amber-300 hover:underline">
        ← Voltar ao painel
      </Link>
      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-400">Eletrotécnico GO · Área restrita</p>
        <h1 className="mt-2 text-3xl font-bold">Orçamentos</h1>
        <p className="mt-2 text-slate-300">
          Prepare propostas com preço, descrição e validade. O rascunho fica salvo na gestão:
          ele <strong>não é enviado automaticamente</strong> ao cliente. Quando habilitado, o registro de envio ou resposta é apenas uma declaração interna do operador.
        </p>
      </header>

      {sucesso === "rascunho" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Orçamento salvo como rascunho (versão 1). A solicitação foi colocada em preparação.
        </p>
      )}
      {sucesso === "revisao" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Nova versão do rascunho salva. A anterior permanece no histórico e nenhum orçamento foi enviado.
        </p>
      )}
      {sucesso === "evento" && (
        <p role="status" className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          Registro interno salvo, com referência à versão exata da proposta. Nenhuma mensagem ou cobrança foi realizada pelo sistema.
        </p>
      )}
      {erro === "conflito" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Não foi possível concluir a operação. O estado, a validade ou a versão pode ter mudado, ou sua sessão expirou.
        </p>
      )}
      {erro === "dados" && (
        <p role="alert" className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-200">
          Dados inválidos. Verifique a solicitação, valor, descrição e data de validade.
        </p>
      )}

      <section aria-labelledby="criar-orcamento" className="mt-8 rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-7">
        <h2 id="criar-orcamento" className="text-lg font-bold">Criar rascunho</h2>
        {semRascunho.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/20 p-5">
            <p className="font-semibold">Nenhuma solicitação apta para novo rascunho.</p>
            <p className="mt-2 text-sm text-slate-400">
              Qualifique uma solicitação primeiro. Cada solicitação pode ter um rascunho inicial;
              versões posteriores serão tratadas em uma etapa separada.
            </p>
            <Link href="/gestao/leads" className="mt-3 inline-block font-semibold text-amber-300 hover:underline">
              Consultar solicitações →
            </Link>
          </div>
        ) : (
          <form action={criarOrcamentoRascunho} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Solicitação qualificada
              <select name="lead" required defaultValue={principal}
                className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3">
                {semRascunho.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome} — {l.descricao.slice(0, 95)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Valor total em reais (R$)
              <input name="valor" required inputMode="decimal" placeholder="Ex.: 350,00"
                maxLength={11} pattern="[0-9]{1,8}([.,][0-9]{1,2})?"
                className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
            </label>
            <label className="block text-sm">
              Validade da proposta
              <input name="validade" type="date" required
                className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Descrição e condições técnicas da proposta
              <textarea name="descricao" required minLength={10} maxLength={4000}
                placeholder="Serviço proposto, materiais previstos e condições principais."
                className="mt-2 block min-h-32 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
            </label>
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300">
                Salvar rascunho
              </button>
              <p className="mt-3 text-xs text-slate-400">
                Valor em centavos inteiros; sem envio, cobrança, faturamento ou aprovação automática.
              </p>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="lista-orcamentos" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="lista-orcamentos" className="text-xl font-bold">Rascunhos e propostas</h2>
          <p className="text-xs text-slate-400">Até 100 registros mais recentes · somente usuários autorizados</p>
        </div>
        {orcamentos.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/20 p-6 text-slate-300">
            Nenhum orçamento registrado ainda.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {orcamentos.map(o => (
              <li key={o.id} className="rounded-2xl border border-white/15 bg-white/[0.03] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{o.cliente_nome}</h3>
                    <p className="mt-1 text-xs text-slate-400">Orçamento · versão {o.versao}</p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                    {o.status === "rascunho" ? "Rascunho" : o.status}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{o.descricao}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
                  <strong className="text-xl text-white">{formatarValorOrcamento(o.valor_centavos)}</strong>
                  <span className="text-xs text-slate-400">Válido até {formatarValidadeOrcamento(o.validade_em)}</span>
                </div>
                {eventosHabilitados && (o.status === "enviado" || o.status === "rascunho") && (
                  <details className="mt-5 border-t border-white/10 pt-4">
                    <summary className="cursor-pointer font-semibold text-amber-300">
                      {o.status === "rascunho" ? "Registrar envio já realizado" : "Registrar resposta do cliente"}
                    </summary>
                    <form action={registrarEventoOrcamento} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="orcamento" value={o.id} />
                      <input type="hidden" name="versao" value={o.versao} />
                      {o.status === "rascunho" ? (
                        <input type="hidden" name="tipo" value="envio" />
                      ) : (
                        <label className="block text-sm">
                          Resposta relatada pelo cliente
                          <select name="tipo" required defaultValue="recusa"
                            className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3">
                            <option value="aprovacao">Aprovação declarada</option>
                            <option value="recusa">Recusa declarada</option>
                          </select>
                        </label>
                      )}
                      <label className="block text-sm">
                        Canal de comunicação
                        <select name="canal" required defaultValue="whatsapp"
                          className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3">
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">E-mail</option>
                          <option value="telefone">Telefone</option>
                          <option value="presencial">Presencial</option>
                          <option value="outro">Outro</option>
                        </select>
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        Evidência ou referência interna (12 a 500 caracteres)
                        <textarea name="evidencia" required minLength={12} maxLength={500}
                          placeholder="Descreva a confirmação de envio/decisão e a referência verificável, sem incluir senhas ou links privados."
                          className="mt-2 block min-h-24 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
                      </label>
                      <div className="sm:col-span-2">
                        <button className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300">
                          {o.status === "rascunho" ? "Registrar envio manual" : "Registrar decisão relatada"}
                        </button>
                        <p className="mt-2 text-xs text-slate-400">
                          Confirme apenas fatos já ocorridos. O sistema não envia a proposta nem verifica a identidade do cliente.
                          A aprovação declarada não significa pagamento recebido ou ordem de serviço criada.
                          Envio e aprovação fora da validade são recusados pelo banco de dados.
                        </p>
                      </div>
                    </form>
                  </details>
                )}
                {eventosHabilitados && eventos.some(e => e.orcamento_id === o.id) && (
                  <details className="mt-5 border-t border-white/10 pt-4">
                    <summary className="cursor-pointer font-semibold text-slate-200">Histórico de comunicações</summary>
                    <ol className="mt-3 space-y-3">
                      {eventos.filter(e => e.orcamento_id === o.id).map((e, i) => (
                        <li key={`${e.versao}-${e.tipo}-${i}`} className="rounded-lg border border-white/10 p-3 text-sm">
                          <strong>
                            {e.tipo === "envio" ? "Envio informado" : e.tipo === "aprovacao" ? "Aprovação informada" : "Recusa informada"}
                            {" · versão "}{e.versao}
                          </strong>
                          <p className="mt-1 text-slate-400">{e.canal} · {new Date(e.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                          <p className="mt-2 whitespace-pre-wrap text-slate-300">{e.evidencia}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {revisaoHabilitada && o.status === "rascunho" && (
                  <details className="mt-5 border-t border-white/10 pt-4">
                    <summary className="cursor-pointer font-semibold text-amber-300">
                      Revisar rascunho · criar versão {o.versao + 1}
                    </summary>
                    <form action={revisarOrcamentoRascunho} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="orcamento" value={o.id} />
                      <input type="hidden" name="versao" value={o.versao} />
                      <label className="block text-sm">
                        Novo valor em reais (R$)
                        <input name="valor" required inputMode="decimal" maxLength={11}
                          pattern="[0-9]{1,8}([.,][0-9]{1,2})?"
                          defaultValue={valorOrcamentoParaEntrada(o.valor_centavos)}
                          className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
                      </label>
                      <label className="block text-sm">
                        Nova validade
                        <input name="validade" type="date" required
                          defaultValue={validadeOrcamentoParaEntrada(o.validade_em)}
                          className="mt-2 block w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        Descrição e condições revisadas
                        <textarea name="descricao" required minLength={10} maxLength={4000}
                          defaultValue={o.descricao}
                          className="mt-2 block min-h-32 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
                      </label>
                      <div className="sm:col-span-2">
                        <button className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300">
                          Salvar nova versão
                        </button>
                        <p className="mt-2 text-xs text-slate-400">
                          A versão anterior é preservada. Esta ação não envia nem aprova a proposta.
                        </p>
                      </div>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
