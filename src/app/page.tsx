import Image from "next/image";

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
    destaque: true,
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

const whatsappNumero = "5562993265087";
const whatsappMensagem =
  "Olá, vi o site da Fase Plena Elétrica e gostaria de solicitar um orçamento.";
const whatsappLink =
  `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(whatsappMensagem)}`;

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Electrician",
    name: "Fase Plena Elétrica",
    url: "https://eletrotecnicogo.com.br",
    telephone: "+55 62 99326-5087",
    areaServed: cidades.map((cidade) => ({
      "@type": "City",
      name: cidade,
    })),
    serviceType: servicos.map((servico) => servico.titulo),
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#06101d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-white/10 bg-[#06101d]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <a href="#" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xl text-slate-950">
              ⚡
            </span>
            <span className="text-lg">
              Fase Plena <span className="text-amber-400">Elétrica</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
            <a className="transition hover:text-white" href="#servicos">
              Serviços
            </a>
            <a className="transition hover:text-white" href="#resultados">
              Resultados
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

        <div className="relative mx-auto grid min-h-[70vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-20">
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

            <p className="mt-4 text-sm font-semibold text-slate-400">
              Atendimento direto pelo WhatsApp — sem formulário.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-300 sm:grid-cols-2">
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
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
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
                className={
                  servico.destaque
                    ? "group rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6 ring-1 ring-emerald-400/10 transition hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-emerald-800/[0.09]"
                    : "group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[0.07]"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-400/10 text-2xl">
                    {servico.icone}
                  </div>
                  {servico.destaque && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                      Serviço em destaque
                    </span>
                  )}
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{servico.titulo}</h3>
                <p className="mt-3 leading-7 text-slate-300">{servico.texto}</p>
                {servico.destaque && (
                  <a
                    href="/limpeza-de-placas-solares"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-300 transition hover:text-emerald-200"
                  >
                    Conhecer o serviço <span aria-hidden="true">→</span>
                  </a>
                )}
              </article>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="/servicos-eletricos"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Ver todos os serviços elétricos <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      <section id="resultados" className="border-y border-white/10 bg-[#071321]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
                Serviço realizado
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                Fotos reais do atendimento
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Antes e depois da limpeza de placas solares
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Comparação real de um serviço de limpeza em sistema fotovoltaico.
              Poeira, resíduos e sujeira acumulada podem reduzir a passagem de luz
              até as células. A limpeza periódica ajuda a manter os módulos em boas
              condições de operação.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                <Image
                  src="/solar/antes-hq.webp"
                  alt="Placas solares antes da limpeza com sujeira acumulada"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
                <span className="absolute left-4 top-4 rounded-full bg-slate-950/90 px-4 py-2 text-sm font-black text-amber-300">
                  ANTES
                </span>
              </div>
              <figcaption className="p-5 leading-7 text-slate-300">
                Antes: módulos com camada visível de poeira e sujeira acumulada.
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                <Image
                  src="/solar/depois-hq.webp"
                  alt="Placas solares depois da limpeza"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
                <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                  DEPOIS
                </span>
              </div>
              <figcaption className="p-5 leading-7 text-slate-300">
                Depois: superfície dos módulos limpa, com o vidro novamente visível
                e uniforme.
              </figcaption>
            </figure>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="/limpeza-de-placas-solares"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-4 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
            >
              Ver todos os resultados de limpeza <span aria-hidden="true">→</span>
            </a>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10"
            >
              <span>💬</span>
              Solicitar orçamento
            </a>
          </div>
        </div>
      </section>

      <section id="regioes" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
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
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
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

      <section id="orcamento" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
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
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-emerald-700 px-6 py-4 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
            >
              <span>💬</span>
              Chamar no WhatsApp
            </a>

            <p className="mt-4 text-sm text-slate-400">
              WhatsApp: (62) 99326-5087
            </p>
          </div>
        </div>
      </section>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Solicitar orçamento pelo WhatsApp"
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-emerald-700 text-xl shadow-2xl shadow-black/40 ring-4 ring-[#06101d] transition hover:-translate-y-1 hover:bg-emerald-800 lg:bottom-5 lg:right-5"
      >
        💬
      </a>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 pb-20 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:pb-8 sm:pr-24 lg:pl-8 lg:pr-28">
          <p>© 2026 Fase Plena Elétrica. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
            <a
              href="/politica-de-privacidade"
              className="transition hover:text-white"
            >
              Política de Privacidade
            </a>
            <span>Atendimento em Goiânia e região.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
