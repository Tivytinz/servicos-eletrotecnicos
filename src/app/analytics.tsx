"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_V2_KEY,
  LEGACY_CONSENT_KEY,
  decodeConsentSnapshot,
  encodePreferences,
  googleConsentFlags,
  type ConsentPreferences,
} from "@/lib/consent-preferences";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
let temporaryPreference: string | null = null;
let consentDefaultsInitialized = false;
let googleTagInitialized = false;

function getConsentSnapshot(): string {
  if (typeof window === "undefined") return "none";
  try {
    const v2 = window.localStorage.getItem(CONSENT_V2_KEY);
    if (v2 !== null) return `v2:${v2}`;
  } catch {
    // Browsers can restrict localStorage; keep a session-only fallback.
  }

  if (temporaryPreference !== null) return `v2:${temporaryPreference}`;

  try {
    const legacy = window.localStorage.getItem(LEGACY_CONSENT_KEY);
    return `legacy:${legacy ?? "none"}`;
  } catch {
    return "none";
  }
}

function subscribeConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
  };
}

function writePreferences(preferences: ConsentPreferences) {
  const encoded = encodePreferences(preferences);
  try {
    window.localStorage.setItem(CONSENT_V2_KEY, encoded);
    temporaryPreference = null;
  } catch {
    temporaryPreference = encoded;
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

function ensureGoogleTagQueue() {
  if (typeof window === "undefined") return null;

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
  analyticsWindow.gtag =
    analyticsWindow.gtag ||
    function gtag() {
      // gtag.js consumes the arguments object from dataLayer.
      // eslint-disable-next-line prefer-rest-params
      analyticsWindow.dataLayer?.push(arguments);
    };

  return analyticsWindow;
}

function updateGoogleConsent(preferences: ConsentPreferences) {
  const analyticsWindow = ensureGoogleTagQueue();
  if (!analyticsWindow) return;

  // Default denied must be queued before config, events, and the script load.
  if (!consentDefaultsInitialized) {
    analyticsWindow.gtag?.("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    consentDefaultsInitialized = true;
  }

  analyticsWindow.gtag?.("consent", "update", googleConsentFlags(preferences));

  if (!preferences.analytics || !measurementId || googleTagInitialized) return;

  googleTagInitialized = true;
  analyticsWindow.gtag?.("js", new Date());
  analyticsWindow.gtag?.("config", measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });

  if (!document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.gaId = measurementId;
    document.head.appendChild(script);
  }
}

type PreferencesPanelProps = {
  initial: ConsentPreferences;
  onSave: (choice: ConsentPreferences) => void;
};

function PreferencesPanel({ initial, onSave }: PreferencesPanelProps) {
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [ads, setAds] = useState(initial.ads);

  return (
    <aside
      aria-label="Preferências de privacidade"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-h-[85vh] max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0a1625]/95 p-5 text-white shadow-2xl shadow-black/40 backdrop-blur sm:bottom-6 sm:p-6"
    >
      <div className="space-y-4">
        <div>
          <p className="font-extrabold">Privacidade e medição</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Escolha como podemos medir visitas e resultados dos anúncios.
            O atendimento pelo WhatsApp funciona mesmo sem autorização.
            Leia a nossa{" "}
            <Link
              href="/politica-de-privacidade"
              className="font-semibold text-amber-300 underline underline-offset-2"
            >
              Política de Privacidade
            </Link>.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-white/15 p-3">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => {
                setAnalytics(event.target.checked);
                if (!event.target.checked) setAds(false);
              }}
              className="mt-1 size-5 accent-amber-400"
            />
            <span>
              <span className="block text-sm font-bold">Análise de visitas (GA4)</span>
              <span className="block text-sm leading-6 text-slate-300">
                Permite cookies analíticos para medir acessos e cliques nos botões de WhatsApp.
              </span>
            </span>
          </label>
          <label className={`flex gap-3 rounded-xl border border-white/15 p-3 ${!analytics ? "opacity-60" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={ads}
              disabled={!analytics}
              onChange={(event) => setAds(event.target.checked)}
              className="mt-1 size-5 accent-amber-400"
            />
            <span>
              <span className="block text-sm font-bold">Medição de anúncios do Google</span>
              <span className="block text-sm leading-6 text-slate-300">
                Com a opção de análise ativada, permite armazenamento publicitário
                e compartilhamento de dados para medir resultados de anúncios.
                Não autoriza anúncios personalizados nem remarketing.
              </span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onSave({ analytics: false, ads: false })}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold hover:bg-white/10"
          >
            Recusar opcionais
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics, ads })}
            className="rounded-xl border border-amber-400/60 px-4 py-3 text-sm font-bold hover:bg-amber-400/10"
          >
            Salvar escolhas
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics: true, ads: true })}
            className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300"
          >
            Aceitar análise e medição
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Analytics() {
  const snapshot = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    () => "none",
  );
  const { preferences, needsChoice } = decodeConsentSnapshot(snapshot);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (measurementId) updateGoogleConsent(preferences);
    // The snapshot changes on explicit consent changes or cross-tab updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = event.target;
      if (!(element instanceof Element)) return;

      const link = element.closest(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"]',
      ) as HTMLAnchorElement | null;

      if (!link) return;

      const params = new URLSearchParams(window.location.search);
      const payload = {
        event: "whatsapp_click",
        page_path: window.location.pathname,
        page_title: document.title,
        page_location: window.location.href,
        cta_text: link.textContent?.trim() || "WhatsApp",
        destination: link.href,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_term: params.get("utm_term"),
        utm_content: params.get("utm_content"),
      };

      window.dispatchEvent(
        new CustomEvent("whatsapp_click", { detail: payload }),
      );

      const current = decodeConsentSnapshot(getConsentSnapshot()).preferences;
      if (!measurementId || !current.analytics) return;

      const analyticsWindow = ensureGoogleTagQueue();
      analyticsWindow?.gtag?.("event", "whatsapp_click", {
        // WhatsApp CTAs open in a new tab; original page can finish sending.
        event_callback: () => undefined,
        event_timeout: 2000,
        page_path: payload.page_path,
        page_title: payload.page_title,
        cta_text: payload.cta_text,
        link_url: payload.destination,
        page_location: payload.page_location,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_term: payload.utm_term,
        utm_content: payload.utm_content,
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!measurementId) return null;

  if (needsChoice || editing) {
    return (
      <PreferencesPanel
        initial={preferences}
        onSave={(choice) => {
          writePreferences(choice);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="fixed bottom-3 left-3 z-[90] rounded-lg border border-white/20 bg-[#0a1625]/95 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg hover:bg-[#16243a] sm:bottom-4 sm:left-4"
      aria-label="Revisar preferências de cookies e privacidade"
    >
      Privacidade
    </button>
  );
}
