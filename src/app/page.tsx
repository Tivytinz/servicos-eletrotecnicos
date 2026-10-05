const cidades = [
  "Goiânia",
  "Aparecida de Goiânia",
  "Hidrolândia",
  "Senador Canedo",
  "Trindade",
];

const servicos = [
  {
    titulo: "Instalações elétricas",
    texto:
      "Instalações, ampliações e adequações elétricas para residências e comércios.",
    icone: "⚡",
  },
  {
    titulo: "Manutenção elétrica",
    texto:
      "Diagnóstico de falhas, correções e manutenção preventiva para reduzir riscos e interrupções.",
    icone: "🔧",
  },
  {
    titulo: "Quadros e circuitos",
    texto:
      "Organização, revisão e adequação de quadros, disjuntores, circuitos e pontos elétricos.",
    icone: "🧰",
  },
  {
    titulo: "Energia solar",
    texto:
      "Manutenção e suporte técnico para sistemas fotovoltaicos residenciais e comerciais.",
    icone: "☀️",
  },
  {
    titulo: "Limpeza de placas solares",
    texto:
      "Limpeza técnica de módulos fotovoltaicos para ajudar a manter o desempenho do sistema.",
    icone: "🧼",
  },
  {
    titulo: "Inspeção elétrica",
    texto:
      "Avaliação visual e técnica de instalações para identificar pontos que precisam de atenção.",
    icone: "🔎",
  },
];

const diferenciais = [
  "Atendimento em Goiânia e região",
  "Orçamento direto e sem complicação",
  "Serviços residenciais e comerciais",
  "Foco em segurança e organização",
];

const whatsappNumero = "556293265087";
const whatsappMensagem =
  "Olá, vi o site Eletrotécnico GO e gostaria de solicitar um orçamento.";
const whatsappLink =
  `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(whatsappMensagem)}`;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#06101d] text-white">
      <header className="border-b border-white/10 bg-[#06101d]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <a href="#" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xl text-slate-950">
              ⚡
            </span>
            <span className="text-lg">
              Eletrotécnico <span className="text-amber-400">GO</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
            <a className="transition hover:text-white" href="#servicos">
              Serviços
            </a>
            <a className="transition hover:text-white" href="#regioes">
              Regiões
            </a>
            <a className="transition hover:text-white" href="#orcamento">
              Orçamento
            </a>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute -right-36 top-16 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 bottom-10 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
              <span>⚡</span> Atendimento em Goiânia e região
            </span>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Serviços elétricos com
              <span className="text-amber-400"> segurança e agilidade.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Instalação, manutenção elétrica e serviços em energia solar para
              residências e comércios em Goiânia e cidades da região.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-amber-400 px-7 py-4 text-center font-extrabold text-slate-950 shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Solicitar orçamento no WhatsApp
              </a>
              <a
                href="#servicos"
                className="rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-center font-bold transition hover:bg-white/10"
              >
                Conhecer serviços
              </a>
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 text-sm text-slate-300 sm:grid-cols-2">
              {diferenciais.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-transparent p-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
                    Atendimento técnico
                  </span>
                  <span className="text-3xl">⚡</span>
                </div>

                <h2 className="mt-8 text-3xl font-black">
                  Precisando de um eletrotécnico?
                </h2>
                <p className="mt-4 leading-7 text-slate-300">
                  Explique o serviço que precisa e solicite um orçamento para
                  sua residência, comércio ou sistema fotovoltaico.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    "Instalações e manutenção",
                    "Energia solar",
                    "Limpeza de placas solares",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3"
                    >
                      <span className="text-amber-300">●</span>
                      <span className="font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="border-y border-white/10 bg-[#0a1625]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
              Serviços
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Soluções elétricas para diferentes necessidades
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Atendimento para instalações, manutenções e sistemas de energia
              solar, com foco em execução organizada e segura.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {servicos.map((servico) => (
              <article
                key={servico.titulo}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[0.07]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-400/10 text-2xl">
                  {servico.icone}
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{servico.titulo}</h3>
                <p className="mt-3 leading-7 text-slate-300">{servico.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="regioes" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
              Área de atendimento
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Goiânia e cidades da região
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Atendimento local para facilitar visitas técnicas, avaliações e
              execução de serviços elétricos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cidades.map((cidade, index) => (
              <div
                key={cidade}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-400 font-black text-slate-950">
                  {index + 1}
                </span>
                <span className="font-bold">{cidade}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a1625]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              ["1", "Explique o serviço", "Conte o que precisa ser instalado, revisado ou reparado."],
              ["2", "Receba a avaliação", "Alinhamos as informações necessárias para entender o atendimento."],
              ["3", "Agende o serviço", "Com o orçamento aprovado, combinamos o atendimento."],
            ].map(([numero, titulo, texto]) => (
              <div key={numero} className="rounded-2xl border border-white/10 p-6">
                <span className="text-5xl font-black text-amber-400/30">{numero}</span>
                <h3 className="mt-4 text-xl font-extrabold">{titulo}</h3>
                <p className="mt-3 leading-7 text-slate-300">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="orcamento" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-white/[0.04] to-transparent p-8 sm:p-12">
          <div className="max-w-3xl">
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">
              Solicite um orçamento
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Tem um serviço elétrico para fazer?
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Fale diretamente pelo WhatsApp, explique o serviço que precisa e
              solicite seu orçamento.
            </p>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-emerald-500 px-6 py-4 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              <span>💬</span>
              Chamar no WhatsApp
            </a>

            <p className="mt-4 text-sm text-slate-400">
              WhatsApp: (62) 9326-5087
            </p>
          </div>
        </div>
      </section>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Solicitar orçamento pelo WhatsApp"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl shadow-2xl shadow-black/40 transition hover:-translate-y-1 hover:bg-emerald-400"
      >
        💬
      </a>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© 2026 Eletrotécnico GO. Todos os direitos reservados.</p>
          <p className="text-left sm:text-right">Atendimento em Goiânia e região.</p>
        </div>
      </footer>
    </main>
  );
}
