const cidades = [
  "Goiânia",
  "Aparecida de Goiânia",
  "Hidrolândia",
  "Senador Canedo",
  "Trindade",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20 lg:px-8">
        <span className="mb-5 w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300">
          ⚡ Atendimento em Goiânia e região
        </span>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          Serviços eletrotécnicos com segurança, qualidade e atendimento rápido.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Instalação, manutenção e soluções elétricas para residências,
          comércios e sistemas de energia solar.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {cidades.map((cidade) => (
            <span
              key={cidade}
              className="rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300 ring-1 ring-white/10"
            >
              {cidade}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="#orcamento"
            className="rounded-xl bg-amber-400 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-amber-300"
          >
            Solicitar orçamento
          </a>
          <a
            href="#servicos"
            className="rounded-xl border border-white/15 px-6 py-3 text-center font-semibold transition hover:bg-white/5"
          >
            Ver serviços
          </a>
        </div>

        <div
          id="servicos"
          className="mt-20 grid gap-4 md:grid-cols-3"
        >
          {[
            ["Instalações elétricas", "Projetos, adequações e novas instalações."],
            ["Manutenção", "Diagnóstico e correção de falhas elétricas."],
            ["Energia solar", "Manutenção e limpeza de sistemas fotovoltaicos."],
          ].map(([titulo, texto]) => (
            <article
              key={titulo}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h2 className="text-xl font-bold">{titulo}</h2>
              <p className="mt-3 text-slate-300">{texto}</p>
            </article>
          ))}
        </div>

        <div
          id="orcamento"
          className="mt-16 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6"
        >
          <h2 className="text-2xl font-bold">Solicite seu orçamento</h2>
          <p className="mt-2 text-slate-300">
            O botão do WhatsApp será configurado na próxima etapa com o número de atendimento.
          </p>
        </div>
      </section>
    </main>
  );
}
