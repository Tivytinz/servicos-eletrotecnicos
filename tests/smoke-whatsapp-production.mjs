import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WHATSAPP_SMOKE_BASE_URL ?? "https://eletrotecnicogo.com.br";
const LABEL = "[Origem: anúncio do Google]\n";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function openAndInspect(page, route) {
  const url = new URL(route, BASE_URL).toString();
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.equal(response?.status(), 200, `Página com HTTP ${response?.status()}: ${url}`);

  await page.waitForSelector('a[href*="wa.me"]', { timeout: 15000 });
  // React precisa hidratar o componente que atualiza a origem antes do clique.
  await page.waitForTimeout(1700);

  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll(
      'a[href*="wa.me"], a[href*="api.whatsapp.com"]',
    ));
    if (anchors.length === 0) throw new Error("CTA WhatsApp ausente");

    const links = anchors.map((anchor) => {
      if (!(anchor instanceof HTMLAnchorElement)) throw new Error("CTA inválido");
      // Não navega nem envia mensagem real. Captura todos os CTAs da página.
      anchor.addEventListener("click", (event) => event.preventDefault(), { once: true });
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
      if (anchor.dispatchEvent(event) || !event.defaultPrevented) {
        throw new Error("Clique de QA não foi bloqueado");
      }
      const url = new URL(anchor.href);
      return {
        host: url.hostname,
        destination: url.pathname,
        text: url.searchParams.get("text"),
      };
    });

    return {
      links,
      text: links[0].text,
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
    };
  });
}

async function scenario(title, route, paid) {
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();
  try {
    const result = await openAndInspect(page, route);
    const expectedContext = route.startsWith("/limpeza-de-placas-solares")
      ? "limpeza de placas solares"
      : route.startsWith("/servicos-eletricos") ? "serviços elétricos" : "site Eletrotécnico GO";
    for (const link of result.links) {
      assert.equal(link.host, "wa.me", "Destino não é wa.me");
      assert.equal(link.destination, "/5562996105841", "Destino divergente");
      assert.ok(link.text?.includes(expectedContext), "Mensagem base inesperada para esta página");
      assert.equal(link.text.startsWith(LABEL), paid, "Marcador de origem inesperado");
      assert.equal((link.text.match(/\[Origem: anúncio do Google\]/g) ?? []).length, paid ? 1 : 0);
    }
    console.log(`PASS: ${title}; links=${result.links.length}; marcado=${paid}; H1=${result.h1}`);
  } finally {
    await context.close();
  }
}

try {
  // Healthcheck de produção ou do servidor local da PR.
  const healthContext = await browser.newContext();
  try {
    const health = await healthContext.request.get(new URL("/api/health", BASE_URL).toString());
    assert.equal(health.status(), 200, "Healthcheck indisponível");
    const body = await health.json();
    assert.equal(body.status, "ok");
  } finally {
    await healthContext.close();
  }

  await scenario("Home - visita direta", "/", false);
  await scenario("Home - anúncio pago", "/?utm_source=google&utm_medium=cpc", true);
  await scenario("Auto-tag gclid: anúncio pago", "/servicos-eletricos?gclid=TESTE_SEM_CLIQUE_REAL", true);
  await scenario("UTM cpc: anúncio pago", "/servicos-eletricos?utm_source=google&utm_medium=cpc", true);
  await scenario("Google orgânico: não marcar", "/servicos-eletricos?utm_source=google&utm_medium=organic", false);
  await scenario("Acesso direto: não marcar", "/servicos-eletricos", false);
  await scenario("Energia solar por Ads: marcar", "/limpeza-de-placas-solares?gbraid=TESTE_SEM_CLIQUE_REAL", true);

  const context = await browser.newContext({ locale: "pt-BR" });
  try {
    const page = await context.newPage();
    await openAndInspect(page, "/servicos-eletricos?gclid=TESTE_SEM_CLIQUE_REAL");
    const internal = await openAndInspect(page, "/limpeza-de-placas-solares");
    assert.ok(internal.text?.startsWith(LABEL), "Origem não preservada na navegação entre páginas");
    const organic = await openAndInspect(page, "/servicos-eletricos?utm_source=google&utm_medium=organic");
    assert.ok(!organic.text?.startsWith(LABEL), "Nova visita orgânica deve limpar origem paga");
    console.log("PASS: persistência durante navegação e limpeza em campanha não paga");
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
