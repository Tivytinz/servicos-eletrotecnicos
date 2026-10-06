import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#06101d] px-6 text-white">
      <div className="max-w-xl text-center">
        <span className="text-7xl font-black text-amber-400">404</span>
        <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
          Página não encontrada
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">
          O endereço acessado não existe ou foi alterado.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-xl bg-amber-400 px-6 py-4 font-extrabold text-slate-950 transition hover:bg-amber-300"
          >
            Voltar ao início
          </Link>
          <a
            href="/limpeza-de-placas-solares"
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-4 font-bold transition hover:bg-white/10"
          >
            Limpeza de placas solares
          </a>
        </div>
      </div>
    </main>
  );
}
