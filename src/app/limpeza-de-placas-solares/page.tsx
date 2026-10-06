import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Limpeza de Placas Solares em Goiânia e Região",
  description:
    "Limpeza de placas solares em Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade. Veja resultados reais e solicite orçamento pelo WhatsApp.",
  alternates: {
    canonical: "/limpeza-de-placas-solares",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/limpeza-de-placas-solares",
    title: "Limpeza de Placas Solares em Goiânia e Região",
    description:
      "Veja resultados reais de limpeza de placas solares e solicite orçamento pelo WhatsApp.",
    images: [
      {
        url: "/solar/depois-hq.webp",
        width: 1200,
        height: 900,
        alt: "Placas solares após limpeza",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Limpeza de Placas Solares em Goiânia e Região",
    description:
      "Resultados reais de limpeza de placas solares em Goiânia e cidades da região.",
    images: ["/solar/depois-hq.webp"],
  },
};

const cidades = [
  "Goiânia",
  "Aparecida de Goiânia",
  "Hidrolândia",
  "Senador Canedo",
  "Trindade",
];

const faq = [
  {
    pergunta: "Como solicito um orçamento para limpeza?",
    resposta:
      "Envie uma mensagem pelo WhatsApp e, se possível, fotos do sistema. Com essas informações conseguimos entender melhor o atendimento antes do agendamento.",
  },
  {
    pergunta: "Vocês atendem residências e empresas?",
    resposta:
      "Sim. A limpeza de módulos fotovoltaicos é oferecida para sistemas residenciais, comerciais e empresariais nas cidades atendidas.",
  },
  {
    pergunta: "Quais cidades vocês atendem?",
    resposta:
      "Atendemos Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade.",
  },
  {
    pergunta: "Com que frequência as placas solares precisam de limpeza?",
    resposta:
      "A necessidade varia conforme poeira, vegetação, chuvas, inclinação dos módulos e condições do local. Uma avaliação visual ajuda a identificar quando há acúmulo relevante de sujeira.",
  },
  {
    pergunta: "As fotos de antes e depois são reais?",
    resposta:
      "Sim. Os comparativos exibidos nesta página são registros reais dos serviços apresentados, organizados em pares de antes e depois.",
  },
];

const resultados = [
  {
    titulo: "Limpeza realizada 02",
    antes: "/solar/caso-2-antes.webp",
    depois: "/solar/caso-2-depois.webp",
    posAntes: "50% 54%",
    posDepois: "50% 45%",
    fitDepois: "contain",
  },
  {
    titulo: "Limpeza realizada 03",
    antes: "/solar/caso-3-antes.webp",
    depois: "/solar/caso-3-depois.webp",
    posAntes: "50% 48%",
    posDepois: "50% 48%",
    fitDepois: "contain",
  },
  {
    titulo: "Limpeza realizada 04",
    antes: "/solar/caso-4-antes.webp",
    depois: "/solar/caso-4-depois.webp",
    posAntes: "50% 52%",
    posDepois: "50% 50%",
  },
  {
    titulo: "Limpeza realizada 05",
    antes: "/solar/caso-5-antes.webp",
    depois: "/solar/caso-5-depois.webp",
    posAntes: "50% 50%",
    posDepois: "50% 50%",
  },
  {
    titulo: "Limpeza realizada 06",
    antes: "/solar/caso-6-antes.webp",
    depois: "/solar/caso-6-depois.webp",
    posAntes: "50% 55%",
    posDepois: "50% 45%",
    fitDepois: "contain",
  },
  {
    titulo: "Limpeza realizada 07",
    antes: "/solar/caso-7-antes.webp",
    depois: "/solar/caso-7-depois.webp",
    posAntes: "50% 52%",
    posDepois: "50% 48%",
  },
];

const whatsappNumero = "5562993265087";
const whatsappMensagem =
  "Olá, vi a página de limpeza de placas solares e gostaria de solicitar um orçamento.";
const whatsappLink =
  `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(whatsappMensagem)}`;

export default function LimpezaDePlacasSolares() {
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Limpeza de placas solares",
    provider: {
      "@type": "LocalBusiness",
      name: "Fase Plena Elétrica",
      areaServed: cidades.map((cidade) => ({
        "@type": "City",
        name: cidade,
      })),
      telephone: "+55 62 99326-5087",
      url: "https://eletrotecnicogo.com.br",
    },
    areaServed: cidades.map((cidade) => ({
      "@type": "City",
      name: cidade,
    })),
    serviceType: "Limpeza de placas solares",
    url: "https://eletrotecnicogo.com.br/limpeza-de-placas-solares",
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#06101d] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-white/10 bg-[#06101d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xl text-slate-950">
              ⚡
            </span>
            <span className="text-lg">
              Fase Plena <span className="text-amber-400">Elétrica</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden text-sm font-semibold text-slate-300 transition hover:text-white sm:inline"
            >
              Voltar ao site
            </Link>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-800"
              aria-label="Pedir orçamento para limpeza de placas solares pelo WhatsApp"
            >
              <span className="sm:hidden">Orçamento</span>
              <span className="hidden sm:inline">Pedir orçamento</span>
            </a>
          </div>
        </div>
      </header>

      <section className="relative border-b border-white/10">
        <div className="pointer-events-none absolute -right-28 top-20 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
              ☀️ Serviço especializado em energia solar
            </span>

            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Limpeza de placas solares em
              <span className="text-amber-400"> Goiânia e região</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Remoção de poeira e sujeira acumulada nos módulos fotovoltaicos,
              com atendimento para residências, comércios e empresas.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-emerald-700 px-6 py-4 text-center font-extrabold text-white shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:w-auto sm:min-w-[350px] sm:px-7 sm:whitespace-nowrap"
              >
                💬 Solicitar orçamento pelo WhatsApp
              </a>
              <a
                href="#resultados"
                className="rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-center font-bold transition hover:bg-white/10"
              >
                Ver resultados reais
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-slate-300">
              {["Fotos reais", "Atendimento local", "Orçamento direto"].map(
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

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
            <div className="grid sm:grid-cols-2">
              <figure className="border-b border-white/10 sm:border-b-0 sm:border-r">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                  <Image
                    src="/solar/antes-hq.webp"
                    alt="Placas solares antes da limpeza"
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-black text-amber-300">
                    ANTES
                  </span>
                </div>
              </figure>

              <figure>
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                  <Image
                    src="/solar/depois-hq.webp"
                    alt="Placas solares depois da limpeza"
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">
                    DEPOIS
                  </span>
                </div>
              </figure>
            </div>
            <div className="border-t border-white/10 p-5">
              <p className="font-bold text-white">Resultado real de atendimento</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Comparação do mesmo sistema antes e após a limpeza.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0a1625]">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                "1",
                "Envie fotos",
                "Mostre pelo WhatsApp como estão suas placas solares.",
              ],
              [
                "2",
                "Receba a avaliação",
                "Alinhamos as informações necessárias para o atendimento.",
              ],
              [
                "3",
                "Agende a limpeza",
                "Com o orçamento aprovado, combinamos o serviço.",
              ],
            ].map(([numero, titulo, texto]) => (
              <article
                key={numero}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
              >
                <span className="text-4xl font-black text-amber-400/40">
                  {numero}
                </span>
                <h2 className="mt-4 text-xl font-extrabold">{titulo}</h2>
                <p className="mt-3 leading-7 text-slate-300">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="resultados" className="border-y border-white/10 bg-[#071321]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
              Prova real do serviço
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Antes e depois de limpezas realizadas
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Todos os comparativos abaixo mostram o mesmo sistema antes e
              depois da limpeza.
            </p>
          </div>

          <div className="mt-12 grid gap-7 xl:grid-cols-2">
            {resultados.map((item) => (
              <article
                key={item.titulo}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <div className="border-b border-white/10 px-5 py-4">
                  <h3 className="font-extrabold">{item.titulo}</h3>
                </div>

                <div className="grid sm:grid-cols-2">
                  <figure className="border-b border-white/10 sm:border-b-0 sm:border-r">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                      <Image
                        src={item.antes}
                        alt={`${item.titulo}: placas solares antes da limpeza`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        style={{ objectPosition: item.posAntes }}
                        className="object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-slate-950/90 px-3 py-1.5 text-xs font-black text-amber-300">
                        ANTES
                      </span>
                    </div>
                    <figcaption className="border-t border-white/10 px-4 py-3 text-sm font-semibold text-slate-300">
                      Antes da limpeza
                    </figcaption>
                  </figure>

                  <figure>
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                      {item.fitDepois === "contain" && (
                        <>
                          <Image
                            src={item.depois}
                            alt=""
                            aria-hidden="true"
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            className="scale-110 object-cover opacity-35 blur-2xl"
                          />
                          <div className="absolute inset-0 bg-slate-950/25" />
                        </>
                      )}
                      <Image
                        src={item.depois}
                        alt={`${item.titulo}: placas solares depois da limpeza`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        style={{
                          objectPosition: item.posDepois,
                          objectFit: item.fitDepois === "contain" ? "contain" : "cover",
                        }}
                        className="z-10"
                      />
                      <span className="absolute left-3 top-3 z-20 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">
                        DEPOIS
                      </span>
                    </div>
                    <figcaption className="border-t border-white/10 px-4 py-3 text-sm font-semibold text-slate-300">
                      Após a limpeza
                    </figcaption>
                  </figure>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-xl bg-emerald-700 px-7 py-4 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
            >
              Enviar fotos e pedir orçamento
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#06101d]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
              Área de atendimento
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Atendimento em Goiânia e cidades da região
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Solicite uma avaliação para limpeza de módulos fotovoltaicos em
              residências, comércios e empresas.
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

      <section className="border-t border-white/10 bg-[#071321]">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
              Dúvidas frequentes
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Antes de pedir seu orçamento
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Respostas rápidas sobre atendimento, orçamento e limpeza dos módulos.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {faq.map((item) => (
              <details
                key={item.pergunta}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 open:bg-white/[0.06]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-white">
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

          <div className="mt-8">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-center font-bold transition hover:bg-white/10 sm:w-auto"
            >
              Ainda tem dúvida? Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0a1625]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-400/15 via-white/[0.04] to-transparent p-8 sm:p-12">
            <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-300">
              Solicite um orçamento
            </span>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Suas placas solares precisam de limpeza?
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Envie fotos do sistema pelo WhatsApp e solicite uma avaliação.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-700 px-7 py-4 text-center font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 sm:w-auto"
            >
              💬 Enviar fotos e pedir orçamento
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
        aria-label="Solicitar limpeza de placas solares pelo WhatsApp"
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-emerald-700 text-xl shadow-2xl shadow-black/40 ring-4 ring-[#06101d] transition hover:-translate-y-1 hover:bg-emerald-800 lg:bottom-5 lg:right-5"
      >
        💬
      </a>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 pb-20 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:pb-8 sm:pr-24 lg:pl-8 lg:pr-28">
          <p>© 2026 Fase Plena Elétrica. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
            <a
              className="transition hover:text-white"
              href="/politica-de-privacidade"
            >
              Política de Privacidade
            </a>
            <Link className="transition hover:text-white" href="/">
              Ver todos os serviços
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
