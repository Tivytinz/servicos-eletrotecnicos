import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade do site Eletrotécnico GO e informações sobre contato, dados técnicos e uso do WhatsApp.",
  alternates: {
    canonical: "/politica-de-privacidade",
  },
};

export default function PoliticaDePrivacidade() {
  return (
    <main className="min-h-screen bg-[#06101d] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-3 font-black tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-xl text-slate-950">
              ⚡
            </span>
            <span>
              Eletrotécnico <span className="text-amber-400">GO</span>
            </span>
          </a>
          <a
            href="/"
            className="text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            Voltar ao site
          </a>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <span className="text-sm font-black uppercase tracking-[0.22em] text-amber-400">
          Privacidade
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Política de Privacidade
        </h1>
        <p className="mt-5 text-slate-400">Última atualização: outubro de 2026.</p>

        <div className="mt-10 space-y-10 text-base leading-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-extrabold text-white">
              1. Informações que podem ser tratadas
            </h2>
            <p className="mt-3">
              Este site não possui cadastro de usuários nem formulário próprio.
              Quando você escolhe falar pelo WhatsApp, o contato acontece no
              ambiente do WhatsApp e as informações que você envia são usadas
              para entender o serviço solicitado, preparar uma avaliação e
              responder ao atendimento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-white">
              2. Dados técnicos do acesso
            </h2>
            <p className="mt-3">
              O provedor de hospedagem e a infraestrutura de internet podem
              registrar informações técnicas necessárias para segurança,
              funcionamento e diagnóstico do site, como endereço IP, navegador,
              horário de acesso e páginas requisitadas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-white">
              3. Medição de desempenho e publicidade
            </h2>
            <p className="mt-3">
              O site pode utilizar ferramentas de análise de audiência e
              publicidade para medir visitas, desempenho de campanhas e ações
              como cliques nos botões de WhatsApp. Quando essas ferramentas
              forem ativadas, poderão utilizar cookies ou tecnologias
              equivalentes de acordo com as configurações do navegador e dos
              respectivos provedores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-white">
              4. WhatsApp e serviços de terceiros
            </h2>
            <p className="mt-3">
              Ao clicar em um botão de WhatsApp, você é direcionado a um serviço
              de terceiro. O tratamento de informações dentro dessa plataforma
              também está sujeito às políticas e termos do próprio WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-white">
              5. Uso das informações
            </h2>
            <p className="mt-3">
              As informações recebidas durante o atendimento são utilizadas
              para responder solicitações, elaborar orçamentos, organizar o
              atendimento e manter a comunicação relacionada ao serviço
              solicitado.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-white">
              6. Contato
            </h2>
            <p className="mt-3">
              Para dúvidas sobre esta política ou sobre informações fornecidas
              durante um atendimento, entre em contato pelo WhatsApp
              <strong className="text-white"> (62) 99326-5087</strong>.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <a
            href="/"
            className="inline-flex rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold transition hover:bg-white/10"
          >
            ← Voltar para a página inicial
          </a>
        </div>
      </article>
    </main>
  );
}
