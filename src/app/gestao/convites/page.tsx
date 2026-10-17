import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/gestao/acesso";
import { consultar } from "@/lib/gestao/db";
import { COOKIE_SESSAO, hashTokenSessao } from "@/lib/gestao/sessao";
import FormularioConvite from "./form";
import { revogarConvite } from "./revogar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Convites da equipe",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

type ConviteResumo = {
  id: string;
  usuario: string;
  papel_codigo: "admin" | "tecnico" | "comercial";
  criado_em: Date;
  expira_em: Date;
  status: "pendente" | "utilizado" | "revogado" | "expirado";
};

const DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit",
  year: "numeric", hour: "2-digit", minute: "2-digit",
});

export default async function Convites() {
  if (process.env.GESTAO_HABILITADA !== "true"
    || process.env.GESTAO_CONVITES_HABILITADOS !== "true") redirect("/");
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/gestao/login");
  if (!usuario.papeis.includes("admin")) redirect("/gestao?erro=sem-permissao");

  const tokenSessao = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!tokenSessao || !/^[A-Za-z0-9_-]{43}$/.test(tokenSessao)) {
    redirect("/gestao/login");
  }
  // Consulta passa por função SECURITY DEFINER que revalida o RBAC no banco.
  // Nunca retornamos o hash ou o token original dos convites.
  const convites = await consultar<ConviteResumo>(
    "SELECT id, usuario, papel_codigo, criado_em, expira_em, status FROM gestao.listar_convites($1)",
    [hashTokenSessao(tokenSessao)],
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <a href="/gestao" className="text-amber-300">← Voltar à gestão</a>
      <h1 className="mt-5 text-3xl font-bold">Convites da equipe</h1>
      <p className="mt-3 text-slate-300">
        Convide integrantes com perfil definido. Cada link expira em 24 horas e só pode ser utilizado uma vez.
      </p>
      <div className="max-w-xl">
        <FormularioConvite />
      </div>
      <h2 className="mt-10 text-xl font-bold">Convites recentes</h2>
      <p className="mt-2 text-sm text-slate-400">Até 100 registros recentes. Links secretos não podem ser recuperados.</p>
      {convites.length === 0 ? (
        <p className="mt-5 rounded-xl border border-white/15 p-5 text-slate-300">
          Nenhum convite disponível.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {convites.map((convite) => (
            <li key={convite.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/15 p-4">
              <div>
                <p className="font-bold">{convite.usuario}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Perfil: {convite.papel_codigo} · Estado: {convite.status}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Criado em {DATA.format(convite.criado_em)} · Expira em {DATA.format(convite.expira_em)}
                </p>
              </div>
              {convite.status === "pendente" && (
                <form action={revogarConvite}>
                  <input type="hidden" name="id" value={convite.id} />
                  <button type="submit" className="rounded-lg border border-rose-300/50 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10">
                    Revogar convite
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
