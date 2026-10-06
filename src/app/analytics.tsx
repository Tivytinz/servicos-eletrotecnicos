"use client";

import { useEffect } from "react";

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: (...args: unknown[]) => void;
};

export default function Analytics() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = event.target;
      if (!(element instanceof Element)) return;

      const link = element.closest(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"]',
      ) as HTMLAnchorElement | null;

      if (!link) return;

      const analyticsWindow = window as AnalyticsWindow;
      const payload = {
        event: "whatsapp_click",
        page_path: window.location.pathname,
        page_title: document.title,
        cta_text: link.textContent?.trim() || "WhatsApp",
        destination: link.href,
      };

      analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
      analyticsWindow.dataLayer.push(payload);

      analyticsWindow.gtag?.("event", "whatsapp_click", {
        page_path: payload.page_path,
        page_title: payload.page_title,
        cta_text: payload.cta_text,
      });

      window.dispatchEvent(
        new CustomEvent("whatsapp_click", {
          detail: payload,
        }),
      );
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
