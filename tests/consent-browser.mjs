import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = "http://127.0.0.1:3210/servicos-eletricos";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function createSession() {
  const context = await browser.newContext({ locale: "pt-BR" });
  // Do not send any test traffic to Google.
  await context.route("https://www.googletagmanager.com/**", (route) => route.abort());
  return context;
}

async function commands(page) {
  return page.evaluate(() => {
    const w = window;
    return (w.dataLayer ?? []).map((args) => Array.from(args));
  });
}

function latestConsent(records) {
  return records.filter(([a, b]) => a === "consent" && b === "update").at(-1)?.[2];
}

async function safeWhatsAppClick(page) {
  await page.evaluate(() => {
    const link = document.querySelector('a[href*="wa.me"]');
    if (!link) throw new Error("WhatsApp CTA ausente");
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    const event = new MouseEvent("click", { view: window, bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    if (!event.defaultPrevented) throw new Error("QA não cancelou navegação externa");
  });
}

async function waitForConsent(page, expected) {
  await page.waitForFunction((expected) => {
    const records = (window.dataLayer ?? []).map((args) => Array.from(args));
    const current = records.filter((args) => args[0] === "consent" && args[1] === "update").at(-1)?.[2];
    return Boolean(current) && Object.entries(expected).every(([key, val]) => current[key] === val);
  }, expected);
}

try {
  const context = await createSession();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Recusar opcionais" }).waitFor();

  let records = await commands(page);
  const firstConsent = records.find((args) => args[0] === "consent");
  assert.equal(firstConsent?.[1], "default", "Consentimento padrão precisa vir primeiro");
  assert.equal(firstConsent[2].analytics_storage, "denied");
  assert.equal(firstConsent[2].ad_storage, "denied");
  assert.equal(firstConsent[2].ad_user_data, "denied");
  assert.equal(firstConsent[2].ad_personalization, "denied");
  assert.ok(!records.some((args) => args[0] === "config"), "GA4 antes de escolha explícita");
  assert.equal(await page.locator("script[data-ga-id]").count(), 0);

  await safeWhatsAppClick(page);
  records = await commands(page);
  assert.equal(records.filter((x) => x[0] === "event" && x[1] === "whatsapp_click").length, 0);
  console.log("PASS: sem consentimento, não carrega Analytics nem envia clique");

  await page.getByRole("checkbox", { name: /Análise de visitas/ }).check();
  await page.getByRole("button", { name: "Salvar escolhas" }).click();
  await waitForConsent(page, {
    analytics_storage: "granted", ad_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  records = await commands(page);
  assert.ok(records.some((args) => args[0] === "config"), "GA4 não carregou com aceite");
  await safeWhatsAppClick(page);
  records = await commands(page);
  assert.equal(records.filter((x) => x[0] === "event" && x[1] === "whatsapp_click").length, 1);
  console.log("PASS: apenas Analytics é concedido e registra whatsapp_click");

  await page.getByRole("button", { name: /Revisar preferências de cookies e privacidade/ }).click();
  await page.getByRole("checkbox", { name: /Medição de anúncios/ }).check();
  await page.getByRole("button", { name: "Salvar escolhas" }).click();
  await waitForConsent(page, {
    analytics_storage: "granted", ad_storage: "granted",
    ad_user_data: "granted", ad_personalization: "denied",
  });
  assert.equal(latestConsent(await commands(page)).ad_personalization, "denied");
  console.log("PASS: consentimento de medição Ads sem anúncios personalizados");

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForConsent(page, {
    analytics_storage: "granted", ad_storage: "granted",
    ad_user_data: "granted", ad_personalization: "denied",
  });
  await page.getByRole("button", { name: /Revisar preferências de cookies e privacidade/ }).click();
  await page.getByRole("button", { name: "Recusar opcionais" }).click();
  await waitForConsent(page, {
    analytics_storage: "denied", ad_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  records = await commands(page);
  const previousEventCount = records.filter((x) => x[0] === "event" && x[1] === "whatsapp_click").length;
  await safeWhatsAppClick(page);
  records = await commands(page);
  assert.equal(records.filter((x) => x[0] === "event" && x[1] === "whatsapp_click").length, previousEventCount);
  console.log("PASS: persistência e revogação imediata do consentimento");
  await context.close();

  const legacy = await createSession();
  await legacy.addInitScript(() => localStorage.setItem("eletrotecnico_go_analytics_consent", "accepted"));
  const legacyPage = await legacy.newPage();
  await legacyPage.goto(url, { waitUntil: "domcontentloaded" });
  await legacyPage.getByRole("checkbox", { name: /Análise de visitas/ }).waitFor();
  // Wait for React hydration + useSyncExternalStore to restore legacy storage.
  await waitForConsent(legacyPage, { analytics_storage: "granted", ad_user_data: "denied" });
  await legacyPage.waitForFunction(() => {
    const inputs = [...document.querySelectorAll('aside[aria-label="Preferências de privacidade"] input[type="checkbox"]')];
    return inputs.length === 2 && inputs[0].checked && !inputs[1].checked;
  });
  assert.equal(await legacyPage.getByRole("checkbox", { name: /Análise de visitas/ }).isChecked(), true);
  assert.equal(await legacyPage.getByRole("checkbox", { name: /Medição de anúncios/ }).isChecked(), false);
  console.log("PASS: legado Analytics não concede medição de anúncios");
  await legacy.close();

  const rejected = await createSession();
  await rejected.addInitScript(() => localStorage.setItem("eletrotecnico_go_analytics_consent", "rejected"));
  const rejectedPage = await rejected.newPage();
  await rejectedPage.goto(url, { waitUntil: "domcontentloaded" });
  await rejectedPage.getByRole("button", { name: /Revisar preferências de cookies e privacidade/ }).waitFor();
  assert.equal(await rejectedPage.locator("script[data-ga-id]").count(), 0);
  await rejectedPage.getByRole("button", { name: /Revisar preferências de cookies e privacidade/ }).click();
  await rejectedPage.getByRole("checkbox", { name: /Análise de visitas/ }).waitFor();
  console.log("PASS: recusa antiga mantida, com opção de revisar");
  await rejected.close();
} finally {
  await browser.close();
}
