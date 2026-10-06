"use client";

import { useEffect, useState } from "react";

type ConsentState = "accepted" | "rejected" | null;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const consentKey = "eletrotecnico_go_analytics_consent";

function loadGoogleAnalytics() {
  if (!measurementId || typeof window === "undefined") return;

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
  analyticsWindow.gtag =
    analyticsWindow.gtag ||
    function gtag(...args: unknown[]) {
      analyticsWindow.dataLayer?.push(args);
    };

  analyticsWindow.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (!document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.gaId = measurementId;
    document.head.appendChild(script);
  }

  analyticsWindow.gtag("js", new Date());
  analyticsWindow.gtag("config", measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });
}

export default function Analytics() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(consentKey);
    const initialConsent: ConsentState =
      saved === "accepted" || saved === "rejected" ? saved : null;

    setConsent(initialConsent);
    setReady(true);

    if (initialConsent === "accepted") {
      loadGoogleAnalytics();
    }
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = event.target;
      if (!(element instanceof Element)) return;

      const link = element.closest(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"]',
      ) as HTMLAnchorElement | null;

      if (!link) return;

      const payload = {
        event: "whatsapp_click",
        page_path: window.location.pathname,
        page_title: document.title,
        cta_text: link.textContent?.trim() || "WhatsApp",
        destination: link.href,
      };

      window.dispatchEvent(
        new CustomEvent("whatsapp_click", {
          detail: payload,
        }),
      );

      if (window.localStorage.getItem(consentKey) !== "accepted") return;

      const analyticsWindow = window as AnalyticsWindow;
      analyticsWindow.gtag?.("event", "whatsapp_click", {
        page_path: payload.page_path,
        page_title: payload.page_title,
        cta_text: payload.cta_text,
        link_url: payload.destination,
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!measurementId || !ready || consent !== null) return null;

  const accept = () => {
    window.localStorage.setItem(consentKey, "accepted");
    setConsent("accepted");
    loadGoogleAnalytics();
  };

  const reject = () => {
    window.localStorage.setItem(consentKey, "rejected");
    setConsent("rejected");
  };

  return (
    <aside
      aria-label="Preferências de privacidade"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#0a1625]/95 p-5 text-white shadow-2xl shadow-black/40 backdrop-blur sm:bottom-6 sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="font-extrabold">Privacidade e medição</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Podemos usar o Google Analytics para entender visitas e cliques no
            WhatsApp. Você pode aceitar ou continuar sem essa medição. Consulte
            nossa{" "}
            <a
              href="/politica-de-privacidade"
              className="font-semibold text-amber-300 underline underline-offset-2"
            >
              Política de Privacidade
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={reject}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-300"
          >
            Aceitar
          </button>
        </div>
      </div>
    </aside>
  );
}
