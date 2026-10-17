"use client";

import { useActionState, useEffect, useRef } from "react";
import { aceitarConvite, type EstadoAceite } from "./actions";

const INICIAL: EstadoAceite = { erro: null, sucesso: false };

export default function FormularioAceite() {
  const tokenInput = useRef<HTMLInputElement>(null);
  const [estado, enviar, pendente] = useActionState(aceitarConvite, INICIAL);

  useEffect(() => {
    // O token vive somente no fragmento e no campo privado do formulário.
    // Evitar setState em useEffect e não renderizar o segredo em HTML/SSR.
    const secreto = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (tokenInput.current && /^[A-Za-z0-9_-]{43}$/.test(secreto)) {
      tokenInput.current.value = secreto;
    }
  }, []);

  if (estado.sucesso) {
    return <section role="status" className="mt-6 rounded-xl border border-emerald-500/50 p-6">
      <p className="font-bold text-emerald-300">Conta criada com sucesso.</p>
      <p className="mt-3">Agora você pode entrar com seu usuário e a senha que definiu.</p>
      <a href="/gestao/login" className="mt-4 inline-block text-amber-300 underline">Entrar na gestão</a>
    </section>;
  }

  return (
    <form action={enviar} className="mt-8 space-y-5 rounded-xl border border-white/15 p-6">
      <input name="token" type="hidden" ref={tokenInput} />
      <label className="block">Seu nome
        <input name="nome" required minLength={2} maxLength={160} autoComplete="name"
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
      </label>
      <label className="block">Crie uma senha
        <input name="senha" type="password" required minLength={12} maxLength={1024}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
      </label>
      <label className="block">Confirme sua senha
        <input name="confirmacao" type="password" required minLength={12} maxLength={1024}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
      </label>
      <p className="text-sm text-slate-300">Utilize o link privado completo enviado pelo administrador.</p>
      {estado.erro && <p role="alert" className="text-rose-300">{estado.erro}</p>}
      <button type="submit" disabled={pendente}
        className="w-full rounded-lg bg-amber-400 p-3 font-bold text-slate-950 disabled:opacity-60">
        {pendente ? "Criando conta..." : "Ativar minha conta"}
      </button>
    </form>
  );
}
