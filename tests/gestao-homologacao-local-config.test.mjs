import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const compose = readFileSync("docker-compose.homologacao-local.yml", "utf8");
const dockerignore = readFileSync(".dockerignore", "utf8");
const preparo = readFileSync("scripts/gestao-preparar-homologacao.mjs", "utf8");
const powerShell = readFileSync("scripts/homologacao-local.ps1", "utf8");

test("homologacao publica somente HTTPS na interface loopback", () => {
  assert.match(compose, /127\.0\.0\.1:3443:443/);
  assert.match(compose, /gestao_homologacao/);
  const db = compose.split("  db:")[1].split("  preparar:")[0];
  assert.doesNotMatch(db, /\bports:/);
  const web = compose.split("  web:")[1].split("  https:")[0];
  assert.doesNotMatch(web, /DATABASE_URL_ADMIN/);
  assert.doesNotMatch(web, /railway\.app|eletrotecnicogo\.com\.br/i);
});

test("bootstrap bloqueia acesso a bancos fora do Docker local", () => {
  assert.match(preparo, /hostname !== "db"/);
  assert.match(preparo, /pathname !== "\/gestao_homologacao"/);
  assert.match(preparo, /GESTAO_HOMOLOGACAO_LOCAL/);
});

test("segredos locais nao entram no Git nem sao herdados de producao", () => {
  assert.match(dockerignore, /\.env\.\*/);
  assert.match(powerShell, /DATABASE_URL_ADMIN/);
  assert.match(powerShell, /RandomNumberGenerator/);
  assert.match(compose, /POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD/);
});

const composeOs016 = readFileSync("docker-compose.homologacao-os016.yml", "utf8");
const scriptOs016 = readFileSync("scripts/homologacao-os016.ps1", "utf8");

test("QA da OS 016 nao reutiliza porta, projeto ou credenciais da homologacao 015", () => {
  assert.match(composeOs016, /^name: eg-homologacao-os016/m);
  assert.match(composeOs016, /127\.0\.0\.1:3444:443/);
  assert.doesNotMatch(composeOs016, /127\.0\.0\.1:3443:443/);
  assert.match(composeOs016, /GESTAO_ORIGEM_PUBLICA: https:\/\/localhost:3444/);
  assert.match(composeOs016, /GESTAO_OS_PLANEJAMENTO_HABILITADO: "true"/);
  assert.match(composeOs016, /image: eg-homologacao-os016-node/);
  const db = composeOs016.split("  db:")[1].split("  preparar:")[0];
  assert.doesNotMatch(db, /\bports:/);
  const web = composeOs016.split("  web:")[1].split("  https:")[0];
  assert.doesNotMatch(web, /DATABASE_URL_ADMIN/);
  assert.doesNotMatch(web, /railway\.app|eletrotecnicogo\.com\.br/i);
  assert.match(scriptOs016, /\.env\.homologacao-os016/);
  assert.match(scriptOs016, /docker-compose\.homologacao-os016\.yml/);
  assert.doesNotMatch(scriptOs016, /\.env\.homologacao-local/);
  assert.match(scriptOs016, /RandomNumberGenerator/);
  assert.match(composeOs016, /POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD/);
});
