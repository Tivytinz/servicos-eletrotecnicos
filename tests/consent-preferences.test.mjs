import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeConsentSnapshot,
  encodePreferences,
  googleConsentFlags,
  normalizePreferences,
} from "../src/lib/consent-preferences.ts";

test("visitante novo: não presumir consentimento e solicitar escolhas", () => {
  assert.deepEqual(decodeConsentSnapshot("none"), {
    preferences: { analytics: false, ads: false },
    needsChoice: true,
  });
});

test("legado aceitou só Analytics, nunca anúncios", () => {
  assert.deepEqual(decodeConsentSnapshot("legacy:accepted"), {
    preferences: { analytics: true, ads: false },
    needsChoice: true,
  });
});

test("legado recusado mantém ambas negadas e não reapresenta banner", () => {
  assert.deepEqual(decodeConsentSnapshot("legacy:rejected"), {
    preferences: { analytics: false, ads: false },
    needsChoice: false,
  });
});

test("consentimento versão 2 persiste escolha granular", () => {
  const snapshot = "v2:" + encodePreferences({ analytics: true, ads: false });
  assert.deepEqual(decodeConsentSnapshot(snapshot), {
    preferences: { analytics: true, ads: false },
    needsChoice: false,
  });

  const ads = decodeConsentSnapshot("v2:" + encodePreferences({ analytics: true, ads: true }));
  assert.equal(ads.preferences.ads, true);
  assert.equal(ads.needsChoice, false);
});

test("preferência de anúncios não pode ignorar recusa de Analytics", () => {
  assert.deepEqual(normalizePreferences({ analytics: false, ads: true }), {
    analytics: false,
    ads: false,
  });
  assert.deepEqual(decodeConsentSnapshot('v2:{"version":2,"analytics":false,"ads":true}'), {
    preferences: { analytics: false, ads: false },
    needsChoice: false,
  });
});

test("estado inválido ou corrompido nunca concede consentimento", () => {
  for (const snapshot of [
    "v2:not-json",
    'v2:{"version":2,"analytics":"true","ads":true}',
    'v2:{"version":1,"analytics":true,"ads":true}',
    'v2:{"ads":true,"analytics":true}',
    "legacy:something-else",
  ]) {
    assert.deepEqual(decodeConsentSnapshot(snapshot), {
      preferences: { analytics: false, ads: false },
      needsChoice: true,
    }, snapshot);
  }
});

test("Consent Mode v2 negado por padrão", () => {
  assert.deepEqual(googleConsentFlags({ analytics: false, ads: false }), {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
});

test("Analytics isolado não concede armazenamento ou compartilhamento de publicidade", () => {
  assert.deepEqual(googleConsentFlags({ analytics: true, ads: false }), {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
});

test("medição de Ads explícita concede dois sinais, mas nunca personalização", () => {
  assert.deepEqual(googleConsentFlags({ analytics: true, ads: true }), {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "denied",
  });
});

test("desativar Analytics revoga todos os sinais", () => {
  assert.deepEqual(googleConsentFlags({ analytics: false, ads: true }), {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
});
