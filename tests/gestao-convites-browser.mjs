import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "https://localhost:3443";
const PASSWORD_ADMIN = "senha-ci-descartavel-gestao-2026";
const PASSWORD_CARLOS = "senha-ci-carlos-exclusiva-2026";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const contexts = [];

async function novoContexto() {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: "pt-BR",
  });
  contexts.push(context);
  return context;
}

async function criarConvite(page, usuario, papel) {
  await page.goto(BASE + "/gestao/convites");
  await page.getByLabel("Usuário").fill(usuario);
  await page.getByLabel("Perfil de acesso").selectOption(papel);
  await page.getByRole("button", { name: "Criar convite" }).click();
  const secreto = page.locator("input[readonly]");
  await secreto.waitFor({ timeout: 15000 });
  const link = await secreto.inputValue();
  assert.ok(link.startsWith(BASE + "/gestao/convite#"), "link deve usar fragmento");
  assert.match(link.split("#")[1], /^[A-Za-z0-9_-]{43}$/);
  return link;
}

async function preencherAceite(page, nome, senha) {
  await page.getByLabel("Seu nome").fill(nome);
  await page.getByLabel("Crie uma senha").fill(senha);
  await page.getByLabel("Confirme sua senha").fill(senha);
  await page.getByRole("button", { name: "Ativar minha conta" }).click();
}

async function abrirConvite(link) {
  const c = await novoContexto();
  const page = await c.newPage();
  await page.goto(link);
  await page.waitForFunction(() =>
    /^[A-Za-z0-9_-]{43}$/.test(document.querySelector('input[name="token"]')?.value ?? ""));
  assert.equal(new URL(page.url()).hash, "", "hash deve ser apagado pelo navegador");
  return page;
}

try {
  const adminContext = await novoContexto();
  const admin = await adminContext.newPage();
  await admin.goto(BASE + "/gestao/login");
  await admin.getByLabel("Usuário").fill("qa-admin@example.test");
  await admin.getByLabel("Senha").fill(PASSWORD_ADMIN);
  await admin.getByRole("button", { name: "Entrar" }).click();
  await admin.waitForURL(BASE + "/gestao");
  console.log("PASS: administrador iniciou sessão por HTTPS");

  const conviteCarlos = await criarConvite(admin, "ci-carlos", "admin");
  const carlos = await abrirConvite(conviteCarlos);
  await preencherAceite(carlos, "Carlos de Teste", PASSWORD_CARLOS);
  await carlos.getByRole("status").getByText("Conta criada com sucesso.").waitFor();
  console.log("PASS: convidado definiu a própria senha sem receber credenciais de terceiros");

  const segundo = await abrirConvite(conviteCarlos);
  await preencherAceite(segundo, "Outra Pessoa", "outra-senha-ci-descartavel-2026");
  await segundo.getByRole("alert").getByText(/Convite inválido/).waitFor();
  console.log("PASS: o mesmo convite não pode ser utilizado novamente");

  await admin.goto(BASE + "/gestao/convites");
  await admin.locator("li").filter({ hasText: "ci-carlos" }).getByText(/Estado: utilizado/).waitFor();

  await carlos.getByRole("link", { name: "Entrar na gestão" }).click();
  await carlos.getByLabel("Usuário").fill("ci-carlos");
  await carlos.getByLabel("Senha").fill(PASSWORD_CARLOS);
  await carlos.getByRole("button", { name: "Entrar" }).click();
  await carlos.waitForURL(BASE + "/gestao");
  await carlos.getByRole("link", { name: /Convidar integrante da equipe/ }).waitFor();
  console.log("PASS: novo administrador consegue entrar e possui permissão de convite");

  const conviteTecnico = await criarConvite(admin, "ci-tecnico", "tecnico");
  await admin.goto(BASE + "/gestao/convites");
  const linha = admin.locator("li").filter({ hasText: "ci-tecnico" });
  await linha.getByRole("button", { name: "Revogar convite" }).click();
  await linha.getByText(/Estado: revogado/).waitFor();

  const tecnico = await abrirConvite(conviteTecnico);
  await preencherAceite(tecnico, "Técnico de Teste", "senha-tecnico-ci-descartavel-2026");
  await tecnico.getByRole("alert").getByText(/Convite inválido/).waitFor();
  console.log("PASS: convite revogado não cria conta");
} finally {
  await Promise.all(contexts.map(c => c.close().catch(() => {})));
  await browser.close();
}
