/**
 * Marca somente visitas com sinais explícitos de anúncio pago do Google.
 * Uma visita orgânica do Google (ou apenas utm_source=google) não basta.
 * Nenhum identificador gclid/gbraid/wbraid é incluído na mensagem do WhatsApp.
 */
const GOOGLE_ADS_PREFIX = "[Origem: anúncio do Google]\n";
const PAID_MEDIUMS = new Set(["cpc", "ppc", "paidsearch", "paid_search"]);

export function isGoogleAdsVisit(search: string): boolean {
  const params = new URLSearchParams(search);
  if (["gclid", "gbraid", "wbraid"].some((key) => Boolean(params.get(key)?.trim()))) {
    return true;
  }

  const source = params.get("utm_source")?.trim().toLowerCase();
  const medium = params.get("utm_medium")?.trim().toLowerCase();
  return source === "google" && PAID_MEDIUMS.has(medium ?? "");
}

/** Uma nova campanha identificada e não paga do Google encerra o marcador anterior. */
export function hasOtherCampaignMarker(search: string): boolean {
  const params = new URLSearchParams(search);
  return !isGoogleAdsVisit(search) &&
    ["utm_source", "utm_medium", "fbclid", "msclkid"].some((key) => params.has(key));
}

/**
 * Mantém o texto original e apenas acrescenta/remove o marcador quando necessário.
 * Chamadas repetidas não duplicam o marcador.
 */
export function withWhatsAppSource(href: string, fromGoogleAds: boolean): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }

  if (url.protocol !== "https:" ||
      (url.hostname !== "wa.me" && url.hostname !== "api.whatsapp.com")) {
    return href;
  }

  const originalText = url.searchParams.get("text");
  if (!originalText) return href;

  const genericText = originalText.startsWith(GOOGLE_ADS_PREFIX)
    ? originalText.slice(GOOGLE_ADS_PREFIX.length)
    : originalText;
  const text = fromGoogleAds ? GOOGLE_ADS_PREFIX + genericText : genericText;

  if (text === originalText) return href;
  url.searchParams.set("text", text);
  return url.toString();
}
