import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  WHATSAPP_FORMATADO,
  WHATSAPP_NUMERO,
  WHATSAPP_TELEFONE,
  WHATSAPP_TEL_HREF,
  criarLinkWhatsApp,
} from "../src/lib/contato.ts";

test("contato comercial mantém número e formatos consistentes", () => {
  assert.equal(WHATSAPP_NUMERO, "5562996105841");
  assert.equal(WHATSAPP_TELEFONE, "+5562996105841");
  assert.equal(WHATSAPP_FORMATADO, "(62) 99610-5841");
  assert.equal(WHATSAPP_TEL_HREF, "tel:+5562996105841");
});

test("gerador de links preserva acentos e pontuação da mensagem", () => {
  const mensagem = "Olá! Quero orçamento elétrico & solar.";
  const url = new URL(criarLinkWhatsApp(mensagem));
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/5562996105841");
  assert.equal(url.searchParams.get("text"), mensagem);
});

test("páginas de atendimento importam a fonte única, sem números duplicados", () => {
  const paths = [
    "src/app/page.tsx",
    "src/app/servicos-eletricos/page.tsx",
    "src/app/limpeza-de-placas-solares/page.tsx",
    "src/app/politica-de-privacidade/page.tsx",
  ];
  for (const path of paths) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.ok(source.includes('from "@/lib/contato"'), path);
    assert.doesNotMatch(source, /5562996105841|5562993265087|99326-5087|99610-5841/, path);
  }
});
