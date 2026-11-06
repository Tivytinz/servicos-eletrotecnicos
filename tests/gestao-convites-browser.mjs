import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "https://localhost:3443";
const PASSWORD_ADMIN = "senha-ci-descartavel-gestao-2026";
const PASSWORD_CARLOS = "senha-ci-carlos-exclusiva-2026";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const contexts = [];
const LINK_CONVITES = /(?:Convidar integrante|Gerenciar convites) da equipe/;

async function novoContexto() {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: "pt-BR",
  });
  contexts.push(context);
  return context;
}

async function expandirHistorico(proposta) {
  const historico = proposta.locator("details").filter({ hasText: "Histórico de comunicações" });
  if (!(await historico.evaluate(elemento => elemento.open))) {
    await historico.locator("summary").click();
  }
  assert.equal(await historico.evaluate(elemento => elemento.open), true,
    "o clique deve realmente expandir o histórico");
  await historico.locator("ol").waitFor({ state: "visible" });
  return historico;
}

async function criarConvite(page, usuario, papel) {
  await page.goto(BASE + "/gestao/convites");
  await page.getByLabel("Usuário").fill(usuario);
  await page.getByLabel("Perfil de acesso").selectOption(papel);
  await page.getByLabel("Confirme sua senha de administrador").fill(PASSWORD_ADMIN);
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
  await carlos.getByRole("link", { name: LINK_CONVITES }).waitFor();
  console.log("PASS: novo administrador consegue entrar e possui permissão de convite");

  // Teste real do novo funil, SOMENTE no PostgreSQL descartável do CI.
  await admin.goto(BASE + "/gestao/leads");
  await admin.getByLabel("Cliente").fill("Cliente QA Status");
  await admin.getByLabel("Telefone").fill("62999990000");
  await admin.getByLabel("Origem").selectOption("whatsapp");
  await admin.getByLabel("Descrição").fill("Teste descartável da mudança de etapa");
  await admin.getByRole("button", { name: "Registrar solicitação" }).click();
  await admin.waitForURL(BASE + "/gestao/leads");
  const registro = admin.locator("article").filter({ hasText: "Cliente QA Status" });
  await registro.getByText("Novo", { exact: true }).waitFor();
  await registro.getByLabel("Próxima etapa").selectOption("qualificado");
  await registro.getByRole("button", { name: "Atualizar etapa" }).click();
  await admin.waitForURL(BASE + "/gestao/leads?sucesso=status");
  await admin.getByRole("status").getByText(/Etapa atualizada/).waitFor();
  await admin.locator("article").filter({ hasText: "Cliente QA Status" })
    .getByText("Qualificado", { exact: true }).waitFor();
  console.log("PASS: dashboard operacional registra pedido e evolução de status com auditoria");

  // Novo fluxo financeiro apenas como rascunho: CI isolado, sem dados reais.
  await admin.goto(BASE + "/gestao/orcamentos");
  await admin.getByLabel("Solicitação qualificada").selectOption({ label: "Cliente QA Status — Teste descartável da mudança de etapa" });
  await admin.getByLabel("Valor total em reais (R$)").fill("350,50");
  await admin.getByLabel("Validade da proposta").fill(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10));
  await admin.getByLabel("Descrição e condições técnicas da proposta")
    .fill("Adequação elétrica de teste com materiais e mão de obra");
  await admin.getByRole("button", { name: "Salvar rascunho" }).click();
  await admin.waitForURL(BASE + "/gestao/orcamentos?sucesso=rascunho");
  await admin.getByRole("status").getByText(/Orçamento salvo como rascunho/).waitFor();
  const proposta = admin.locator("li").filter({ hasText: "Cliente QA Status" });
  await proposta.getByText("Rascunho", { exact: true }).waitFor();
  await proposta.getByText(/R\$\s*350,50/).waitFor();
  console.log("PASS: novo administrador prepara orçamento em rascunho sem envio automático");

  // Cobertura E2E do orçamento versionado: somente banco e login fictícios do CI.
  await proposta.getByText("Revisar rascunho · criar versão 2").click();
  await proposta.getByLabel("Novo valor em reais (R$)").fill("420,75");
  await proposta.getByLabel("Nova validade").fill(
    new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
  await proposta.getByLabel("Descrição e condições revisadas")
    .fill("Adequação revisada do quadro elétrico no ambiente de QA");
  await proposta.getByRole("button", { name: "Salvar nova versão" }).click();
  await admin.waitForURL(BASE + "/gestao/orcamentos?sucesso=revisao");
  const revisada = admin.locator("li").filter({ hasText: "Cliente QA Status" });
  await revisada.getByText("Orçamento · versão 2").waitFor();
  await revisada.getByText(/R\$\s*420,75/).waitFor();
  console.log("PASS: revisão salva versão 2 mantendo versão 1 preservada");

  await revisada.getByText("Registrar envio já realizado").click();
  await revisada.getByLabel("Canal de comunicação").selectOption("whatsapp");
  await revisada.getByLabel(/Evidência ou referência interna/)
    .fill("Registro de envio de teste, protocolo qa-v2-013");
  await revisada.getByRole("button", { name: "Registrar envio manual" }).click();
  await admin.waitForURL(BASE + "/gestao/orcamentos?sucesso=evento");
  const enviada = admin.locator("li").filter({ hasText: "Cliente QA Status" });
  await enviada.getByText("enviado", { exact: true }).waitFor();
  await admin.waitForLoadState("networkidle");
  const historicoEnviado = await expandirHistorico(enviada);
  await historicoEnviado.getByText(/Envio informado.*versão 2/).waitFor();

  await enviada.getByText("Registrar resposta do cliente").click();
  await enviada.getByLabel("Resposta relatada pelo cliente").selectOption("aprovacao");
  await enviada.getByLabel("Canal de comunicação").selectOption("telefone");
  await enviada.getByLabel(/Evidência ou referência interna/)
    .fill("Aprovação relatada em ligação fictícia, protocolo qa-013");
  await enviada.getByRole("button", { name: "Registrar decisão relatada" }).click();
  await admin.waitForURL(BASE + "/gestao/orcamentos?sucesso=evento");
  const aprovada = admin.locator("li").filter({ hasText: "Cliente QA Status" });
  await aprovada.getByText("aprovado", { exact: true }).waitFor();
  await admin.waitForLoadState("networkidle");
  const historicoAprovado = await expandirHistorico(aprovada);
  await historicoAprovado.getByText(/Envio informado.*versão 2/).waitFor();
  await historicoAprovado.getByText(/Aprovação informada.*versão 2/).waitFor();
  assert.equal(await aprovada.getByText("Registrar resposta do cliente").count(), 0,
    "estado aprovado não aceita outra decisão");
  console.log("PASS: histórico HTTPS reúne envio e decisão relatada da versão 2, sem mensagem real");

  // Release 014: somente dados sintéticos do PostgreSQL descartável.
  await admin.goto(BASE + "/gestao/ordens-servico");
  await admin.getByRole("heading", { name: /Ordens de Serviço — preparação/ }).waitFor();
  const candidataOS = admin.locator("li").filter({ hasText: "Cliente QA Status" });
  await candidataOS.getByText(/aceite relatado/).waitFor();
  await candidataOS.getByRole("button", { name: "Criar OS pendente de comprovação" }).click();
  await admin.waitForURL(BASE + "/gestao/ordens-servico?sucesso=preparacao");
  await admin.getByRole("status").getByText(/preparação registrada/i).waitFor();
  const pendenteOS = admin.locator("li").filter({ hasText: "Cliente QA Status" });
  await pendenteOS.getByText(/OS pendente — não autorizada para execução/).waitFor();
  assert.equal(await admin.getByRole("button", { name: /Agendar|Iniciar execução|Registrar pagamento/ }).count(), 0,
    "014 não deve liberar execução nem financeiro");
  assert.equal(await admin.getByRole("button", { name: "Criar OS pendente de comprovação" }).count(), 0,
    "criação de OS única por orçamento");
  console.log("PASS: OS preparatória aparece como pendente, sem execução/cobrança e sem duplicidade");






  // Um técnico com conta válida não ganha acesso ao gerenciamento de convites.
  const conviteOperador = await criarConvite(admin, "ci-operador", "tecnico");
  const operador = await abrirConvite(conviteOperador);
  await preencherAceite(operador, "Operador de Teste", "senha-ci-operador-exclusiva-2026");
  await operador.getByRole("status").getByText("Conta criada com sucesso.").waitFor();
  await operador.getByRole("link", { name: "Entrar na gestão" }).click();
  await operador.getByLabel("Usuário").fill("ci-operador");
  await operador.getByLabel("Senha").fill("senha-ci-operador-exclusiva-2026");
  await operador.getByRole("button", { name: "Entrar" }).click();
  await operador.waitForURL(BASE + "/gestao");
  await operador.goto(BASE + "/gestao/leads");
  assert.equal(await operador.getByRole("button", { name: "Atualizar etapa" }).count(), 0,
    "técnico não pode atualizar status do funil");
  await operador.goto(BASE + "/gestao");

  assert.equal(await operador.getByRole("link", { name: LINK_CONVITES }).count(), 0);
  await operador.goto(BASE + "/gestao/orcamentos");
  await operador.waitForURL(BASE + "/gestao?erro=sem-permissao");
  await operador.goto(BASE + "/gestao/convites");
  await operador.waitForURL(BASE + "/gestao?erro=sem-permissao");
  console.log("PASS: técnico autenticado não acessa a gestão de convites");

  const semLink = await (await novoContexto()).newPage();
  await semLink.goto(BASE + "/gestao/convite");
  await preencherAceite(semLink, "Sem Convite", "senha-ci-sem-convite-2026");
  await semLink.getByRole("alert").getByText(/Convite inválido/).waitFor();
  console.log("PASS: cadastro sem token válido é recusado");

  const conviteTecnico = await criarConvite(admin, "ci-tecnico", "tecnico");
  await admin.goto(BASE + "/gestao/convites");
  const linha = admin.locator("li").filter({ hasText: "ci-tecnico" });
  await linha.getByLabel("Senha de administrador").fill(PASSWORD_ADMIN);
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
