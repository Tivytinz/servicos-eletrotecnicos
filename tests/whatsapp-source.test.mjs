import assert from "node:assert/strict";
import test from "node:test";
import {
  hasOtherCampaignMarker,
  isGoogleAdsVisit,
  withWhatsAppSource,
} from "../src/lib/whatsapp-source.ts";

test("reconhece auto-tagging Google Ads com gclid, gbraid ou wbraid", () => {
  for (const param of ["gclid", "gbraid", "wbraid"]) {
    assert.equal(isGoogleAdsVisit("?" + param + "=abc123"), true);
  }
});

test("reconhece UTMs completas de anúncio pago do Google", () => {
  assert.equal(isGoogleAdsVisit("?utm_source=google&utm_medium=cpc"), true);
  assert.equal(isGoogleAdsVisit("?utm_medium=PPC&utm_source=GOOGLE"), true);
  assert.equal(isGoogleAdsVisit("?utm_source=google&utm_medium=paid_search"), true);
});

test("não classifica Google orgânico, fonte isolada ou campanha externa como Ads", () => {
  for (const query of [
    "", "?utm_source=google", "?utm_source=google&utm_medium=organic",
    "?utm_source=facebook&utm_medium=cpc", "?fbclid=xyz", "?gclid=",
  ]) {
    assert.equal(isGoogleAdsVisit(query), false, query);
  }
});

test("nova origem não-Ads explicitamente informada encerra a classificação", () => {
  assert.equal(hasOtherCampaignMarker("?utm_source=google&utm_medium=organic"), true);
  assert.equal(hasOtherCampaignMarker("?utm_source=facebook&utm_medium=cpc"), true);
  assert.equal(hasOtherCampaignMarker("?utm_source=google&utm_medium=cpc"), false);
  assert.equal(hasOtherCampaignMarker(""), false);
});

test("mensagem de anúncio preserva contexto e não inclui identificador de clique", () => {
  const generic = "Olá, vi a página de serviços elétricos e quero orçamento.";
  const url = "https://wa.me/5562993265087?text=" + encodeURIComponent(generic);
  const tagged = withWhatsAppSource(url, true);
  const message = new URL(tagged).searchParams.get("text");
  assert.equal(message, "[Origem: anúncio do Google]\n" + generic);
  assert.equal(new URL(tagged).pathname, "/5562993265087");
  assert.equal(tagged.includes("gclid"), false);
});

test("tagueamento repetido não duplica e pode voltar a mensagem genérica", () => {
  const url = "https://wa.me/5562993265087?text=Quero%20or%C3%A7amento";
  const first = withWhatsAppSource(url, true);
  assert.equal(withWhatsAppSource(first, true), first);
  assert.equal(new URL(withWhatsAppSource(first, false)).searchParams.get("text"), "Quero orçamento");
  assert.equal(withWhatsAppSource(url, false), url);
});

test("não altera URLs externas ao WhatsApp", () => {
  const url = "https://example.com/?text=oi";
  assert.equal(withWhatsAppSource(url, true), url);
  assert.equal(withWhatsAppSource("javascript:alert(1)", true), "javascript:alert(1)");
});
