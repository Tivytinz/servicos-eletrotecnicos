"use client";

import { useEffect, useState } from "react";
import {
  responderPropostaPeloLink, visualizarPropostaPeloLink,
  type PropostaParaAceite,
} from "./actions";
import { formatarValidadeOrcamento, formatarValorOrcamento } from "@/lib/gestao/orcamentos";

export default function FormularioAceiteCliente() {
  const [token,setToken]=useState<string|null>(null);
  const [dados,setDados]=useState<PropostaParaAceite|null>(null);
  const [erro,setErro]=useState<string|null>(null);
  const [carregando,setCarregando]=useState(true);
  const [confirmacao,setConfirmacao]=useState(false);
  const [enviando,setEnviando]=useState(false);
  const [resultado,setResultado]=useState<"aprovacao"|"recusa"|null>(null);

  useEffect(()=>{
    let ativo=true;
    // O fragmento não integra requisição GET, logs do servidor ou Referer.
    const segredo=window.location.hash.slice(1);
    if(!/^[A-Za-z0-9_-]{43}$/.test(segredo)) {
      void Promise.resolve().then(()=>{
        if(!ativo)return;
        setErro("Link inválido ou ausente.");
        setCarregando(false);
      });
      return;
    }
    void visualizarPropostaPeloLink(segredo)
      .then(proposta=>{
        if(!ativo)return;
        if(!proposta)setErro("Link indisponível, expirado, revogado ou já utilizado.");
        else {
          setToken(segredo);
          setDados(proposta);
        }
      })
      .catch(()=>{if(ativo)setErro("Não foi possível verificar a proposta. Tente novamente.");})
      .finally(()=>{if(ativo)setCarregando(false);});
    return()=>{ativo=false;};
  },[]);

  async function responder(resposta:"aprovacao"|"recusa") {
    if(!token || !dados || !confirmacao || enviando)return;
    setEnviando(true);setErro(null);
    try {
      const ok=await responderPropostaPeloLink(token,resposta,true);
      if(!ok){setErro("Não foi possível registrar sua resposta. O link pode ter expirado ou já ter sido utilizado.");return;}
      setResultado(resposta);
      setDados(null);setToken(null);
      window.history.replaceState(null,"",window.location.pathname);
    } catch {
      setErro("Falha ao registrar a resposta. Confira sua conexão e tente novamente.");
    } finally {setEnviando(false);}
  }

  if(resultado) return (
    <section role="status" className="mt-7 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6">
      <h2 className="text-xl font-bold text-emerald-200">Resposta registrada</h2>
      <p className="mt-3 text-slate-200">
        {resultado==="aprovacao"
          ?"Você confirmou a aprovação das condições exibidas."
          :"Você registrou a recusa das condições exibidas."}
      </p>
      <p className="mt-2 text-sm text-slate-300">
        Nenhuma cobrança, pagamento ou ordem de serviço executável foi criada.
        Sua resposta está vinculada à versão apresentada.
      </p>
    </section>
  );

  return (
    <section className="mt-7 rounded-2xl border border-white/15 bg-white/[0.04] p-6">
      {carregando&&<p role="status">Verificando link privado...</p>}
      {erro&&<p role="alert" className="text-rose-300">{erro}</p>}
      {dados&&(
        <>
          <p className="text-sm font-semibold text-amber-300">Orçamento · versão {dados.versao}</p>
          <p className="mt-4 text-3xl font-bold">{formatarValorOrcamento(dados.valor_centavos)}</p>
          <p className="mt-2 text-sm text-slate-300">
            Proposta válida até {formatarValidadeOrcamento(dados.validade_em)}
          </p>
          <h2 className="mt-6 font-semibold">Serviços e condições</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{dados.descricao}</p>
          <label className="mt-7 flex gap-3 rounded-lg border border-white/20 p-4 text-sm">
            <input type="checkbox" checked={confirmacao} onChange={e=>setConfirmacao(e.target.checked)}
              className="mt-1 size-4 accent-amber-400"/>
            <span>Li o valor, a descrição, a validade e a versão desta proposta.
              Quero registrar minha resposta exatamente sobre estas condições.</span>
          </label>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={!confirmacao||enviando}
              onClick={()=>void responder("aprovacao")}
              className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">
              {enviando?"Registrando...":"Aprovar proposta"}
            </button>
            <button type="button" disabled={!confirmacao||enviando}
              onClick={()=>void responder("recusa")}
              className="rounded-lg border border-rose-300/50 px-5 py-3 font-bold text-rose-200 disabled:opacity-40">
              Não aprovar
            </button>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            O link é privado e pode ser utilizado uma única vez. O registro comprova que
            alguém com acesso ao link manifestou uma decisão, mas não confirma, por si só,
            a identidade civil do cliente nem substitui uma assinatura eletrônica com
            verificação de identidade.
          </p>
        </>
      )}
    </section>
  );
}
