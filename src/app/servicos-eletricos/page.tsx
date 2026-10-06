import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Serviços Elétricos em Goiânia e Região",
  description:
    "Instalações, manutenção, quadros, circuitos e inspeção elétrica em Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade. Solicite orçamento pelo WhatsApp.",
  alternates: {
    canonical: "/servicos-eletricos",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/servicos-eletricos",
    title: "Serviços Elétricos em Goiânia e Região",
    description:
      "Instalações, manutenção, quadros, circuitos e inspeção elétrica para residências e comércios.",
  },
};

const cidades = [
  "Goiânia",
  "Aparecida de Goiânia",
  "Hidrolândia",
  "Senador Canedo",
  "Trindade",
];

const servicos = [
  {
    id: "instalacoes",
    titulo: "Instalações elétricas",
    texto:
      "Instalação e adequação de pontos, tomadas, iluminação, circuitos e outros componentes conforme a necessidade do imóvel.",
    icone: "⚡",
  },
  {
    id: "manutencao",
    titulo: "Manutenção elétrica",
    texto:
      "Avaliação de falhas, interrupções, aquecimento, mau contato e outros sinais que indicam necessidade de manutenção.",
    icone: "🔧",
  },
  {
    id: "quadros",
    titulo: "Quadros e circuitos",
    texto:
      "Revisão, organização e adequação de quadros, disjuntores, circuitos e distribuição elétrica.",
    icone: "🧰",
  },
  {
    id: "inspecao",
    titulo: "Inspeção elétrica",
    texto:
      "Avaliação visual e técnica para identificar componentes, conexões ou pontos da instalação que precisam de atenção.",
    icone: "🔎",
  },
];

const faq = [
  {
    pergunta: "Vocês atendem residências e comércios?",
    resposta:
      "Sim. O atendimento pode ser solicitado para imóveis residenciais e comerciais nas cidades atendidas.",
  },
  {
    pergunta: "Como funciona o orçamento?",
    resposta:
      "Envie uma mensagem pelo WhatsApp explicando o serviço e, quando possível, fotos do local. A partir dessas informações é feita uma avaliação inicial para orientar o atendimento.",
  },
  {
    pergunta: "Quais cidades são atendidas?",
    resposta:
      "Atendemos Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade.",
  },
  {
    pergunta: "Posso enviar fotos do problema pelo WhatsApp?",
    resposta:
      "Sim. Fotos e uma descrição objetiva ajudam a entender melhor a situação antes do atendimento presencial.",
  },
];

const whatsappNumero = "5562993265087";
const whatsappMensagem =
  "Olá, vi a página de serviços elétricos do Eletrotécnico GO e gostaria de solicitar um orçamento.";
const whatsappLink =
  `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(whatsappMensagem)}`;

export default function ServicosEletricos() {
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Serviços elétricos",
    serviceType: "Instalação, manutenção e inspeção elétrica",
    provider: {
      "@type": "Electrician",
      name: "Eletrotécnico GO",
      telephone: "+55 62 99326-5087",
      url: "https://eletrotecnicogo.com.br",
      areaServed: cidades.map((cidade) => ({
        "@type": "City",
        name: cidade,
      })),
    },
    areaServed: cidades.map((cidade) => ({
      "@type": "City",
      name: cidade,
    })),
    url: "https://eletrotecnicogo.com.br/servicos-eletricos",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.resposta,
      },
    })),
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#06101d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-white/10 bg-[#06101d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <a href="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xl text-slate-950">
              ⚡
            </span>
            <span className="text-lg">
              Eletrotécnico <span className="text-amber-400">GO</span>
            </span>
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold transition hover:bg-emerald-800"
            aria-label="Pedir orçamento pelo WhatsApp"
          >
            <span className="sm:hidden">Orçamento</span>
            <span className="hidden sm:inline">Pedir orçamento</span>
          </a>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
              ⚡ Atendimento em Goiânia e região
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Serviços elétricos para residências e comércios
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Instalação, manutenção, revisão de quadros e inspeção elétrica com
              atendimento direto pelo WhatsApp em Goiânia e cidades da região.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-amber-400 px-7 py-4 text-center font-extrabold text-slate-950 transition hover:bg-amber-300 sm:w-auto"
              >
                Solicitar orçamento no WhatsApp
              </a>
              <a
                href="#servicos"
                className="rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-center font-bold transition hover:bg-white/10"
              >
                Ver serviços
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-300">
              {["Atendimento local", "Residencial e comercial", "Orçamento direto"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"
                  >
                    ✓ {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">
              Como agilizar a avaliação
            </p>
            <div className="mt-6 space-y-4">
              {[
                "Explique o que está acontecendo ou o que deseja instalar.",
                "Envie fotos do quadro, ponto elétrico ou local quando for possível.",
                "Informe a cidade ou região do atendimento.",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 font-black text-slate-950">
                    {index + 1}
                  </span>
                  <p className="leading-7 text-slate-300">{item}</p>
                </div>
              ))}
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
              Principais atendimentos elétricos
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {servicos.map((servico) => (
              <article
                id={servico.id}
                key={servico.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="text-3xl">{servico.icone}</div>
                <h3 className="mt-4 text-xl font-extrabold">{servico.titulo}</h3>
                <p className="mt-3 leading-7 text-slate-300">{servico.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#06101d]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
              Área de atendimento
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Goiânia e cidades da região
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Informe sua cidade pelo WhatsApp para confirmar disponibilidade e
              organizar o atendimento.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {cidades.map((cidade) => (
              <div
                key={cidade}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 font-bold"
              >
                {cidade}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#071321]">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
          <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
            Dúvidas frequentes
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Antes de solicitar o atendimento
          </h2>
          <div className="mt-10 space-y-3">
            {faq.map((item) => (
              <details
                key={item.pergunta}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 open:bg-white/[0.06]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold">
                  <span>{item.pergunta}</span>
                  <span
                    aria-hidden="true"
                    className="text-xl text-amber-400 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl leading-7 text-slate-300">
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-white/[0.04] to-transparent p-8 sm:p-12">
          <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">
            Orçamento
          </span>
          <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Precisa de um serviço elétrico?
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Envie uma mensagem, explique o que precisa e solicite uma avaliação.
          </p>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex w-full justify-center rounded-xl bg-emerald-700 px-7 py-4 font-extrabold transition hover:bg-emerald-800 sm:w-auto"
          >
            💬 Chamar no WhatsApp
          </a>
        </div>
      </section>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Solicitar orçamento pelo WhatsApp"
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-emerald-700 text-xl shadow-2xl shadow-black/40 ring-4 ring-[#06101d] transition hover:-translate-y-1 hover:bg-emerald-800"
      >
        💬
      </a>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 pb-20 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:pb-8 sm:pr-24 lg:pl-8 lg:pr-28">
          <p>© 2026 Eletrotécnico GO. Todos os direitos reservados.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a className="transition hover:text-white" href="/politica-de-privacidade">
              Política de Privacidade
            </a>
            <a className="transition hover:text-white" href="/">
              Página inicial
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
