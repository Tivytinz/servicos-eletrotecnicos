"use client";

import { useEffect } from "react";
import {
  hasOtherCampaignMarker,
  isGoogleAdsVisit,
  withWhatsAppSource,
} from "@/lib/whatsapp-source";

const originExpiryKey = "eletrotecnico_go_google_ads_contact_until";
const retentionMs = 30 * 60 * 1000;

/**
 * Muda apenas o texto pré-preenchido dos links de WhatsApp.
 * A escuta acontece em window/capture, antes do listener de whatsapp_click
 * instalado no document/capture pelo componente Analytics.
 */
export default function WhatsAppSource() {
  useEffect(() => {
    let paidThisPageUntil = 0;

    function paidSourceActive(): boolean {
      const search = window.location.search;

      if (isGoogleAdsVisit(search)) {
        paidThisPageUntil = Date.now() + retentionMs;
        try {
          window.sessionStorage.setItem(
            originExpiryKey,
            String(paidThisPageUntil),
          );
        } catch {
          // Modo privado pode impedir storage; a visita atual ainda é identificada.
        }
        return true;
      }

      if (hasOtherCampaignMarker(search)) {
        paidThisPageUntil = 0;
        try {
          window.sessionStorage.removeItem(originExpiryKey);
        } catch {
          // Sem necessidade de bloquear o contato.
        }
        return false;
      }

      try {
        const expiresAt = Number(window.sessionStorage.getItem(originExpiryKey));
        if (Number.isFinite(expiresAt) && expiresAt > Date.now()) return true;
        window.sessionStorage.removeItem(originExpiryKey);
      } catch {
        // Fallback apenas enquanto esta página permanecer aberta.
      }

      return paidThisPageUntil > Date.now();
    }

    // Preserva somente o canal e a expiração durante a sessão (nunca o click ID).
    paidSourceActive();

    function onWhatsAppClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const adaptedUrl = withWhatsAppSource(anchor.href, paidSourceActive());
      if (adaptedUrl !== anchor.href) anchor.href = adaptedUrl;
    }

    window.addEventListener("click", onWhatsAppClick, true);
    window.addEventListener("auxclick", onWhatsAppClick, true);
    window.addEventListener("contextmenu", onWhatsAppClick, true);

    return () => {
      window.removeEventListener("click", onWhatsAppClick, true);
      window.removeEventListener("auxclick", onWhatsAppClick, true);
      window.removeEventListener("contextmenu", onWhatsAppClick, true);
    };
  }, []);

  return null;
}
