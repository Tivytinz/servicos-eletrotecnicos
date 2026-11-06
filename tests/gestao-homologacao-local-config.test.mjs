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
