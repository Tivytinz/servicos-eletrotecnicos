"use client";

import { useActionState } from "react";
import { emitirConvite, type EstadoEmissao } from "./actions";

const INICIAL: EstadoEmissao = { erro: null, link: null };

export default function FormularioConvite() {
  const [estado, enviar, pendente] = useActionState(emitirConvite, INICIAL);
  return (
    <section className="mt-8 rounded-xl border border-white/15 p-6">
      <form action={enviar} className="space-y-5">
        <label className="block">Usuário
          <input name="usuario" required minLength={3} maxLength={32}
            pattern="[a-z][a-z0-9_.-]{2,31}" autoComplete="off"
            className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
        </label>
        <label className="block">Perfil de acesso
          <select name="papel" required defaultValue="tecnico"
            className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3">
            <option value="tecnico">Técnico</option>
            <option value="comercial">Comercial</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className="block">Confirme sua senha de administrador
          <input name="senhaAdministrador" type="password" required minLength={12} maxLength={1024}
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" />
        </label>
        <button disabled={pendente}
          className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-60">
          {pendente ? "Gerando..." : "Criar convite"}
        </button>
        {estado.erro && <p role="alert" className="text-rose-300">{estado.erro}</p>}
      </form>
      {estado.link && (
        <section aria-live="polite" className="mt-7 rounded-lg border border-emerald-500/50 p-4">
          <p className="font-bold text-emerald-300">Convite criado — link exibido uma única vez</p>
          <p className="mt-2 text-sm text-slate-300">
            Copie e compartilhe privadamente com a pessoa convidada.
            O link expira em 24 horas. Nunca publique em grupos ou redes sociais.
          </p>
          <label className="mt-3 block text-sm">Link secreto
            <input value={estado.link} readOnly onFocus={event => event.currentTarget.select()}
              className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-sm" />
          </label>
        </section>
      )}
    </section>
  );
}
