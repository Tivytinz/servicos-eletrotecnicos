import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";

const shellScript = "scripts/gestao-migration-railway-manual.sh";
const workflow = readFileSync(".github/workflows/gestao-migrations-production-manual.yml","utf8");

test("workflow de migrations: somente acionamento manual com escopo principal e secrets protegidos", () => {
  assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: gestao-db-production/);
  assert.match(workflow, /group: gestao-migrations-production/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /StrictHostKeyChecking yes/);
  assert.match(workflow, /RAILWAY_GESTAO_WORKSPACE_TOKEN/);
  assert.match(workflow, /RAILWAY_GESTAO_SSH_PRIVATE_KEY/);
  assert.match(workflow, /RAILWAY_GESTAO_KNOWN_HOSTS/);
  assert.doesNotMatch(workflow, /DATABASE_URL_ADMIN|POSTGRES_PASSWORD|PGPASSWORD/);
  assert.doesNotMatch(workflow, /\b(?:railway\s+tcp-proxy|ssh-keyscan)\b/);
});

test("pacotes 012/013/014 correspondem ao conteúdo e SHA-256 de cada migration", () => {
  for(const [number, filename, packageName] of [
    ["012", "012_gestao_revisao_orcamentos.sql","gestao-orcamentos-012-atomico.sql"],
    ["013", "013_gestao_eventos_orcamento.sql","gestao-orcamentos-013-atomico.sql"],
    ["014", "014_gestao_os_preparacao.sql","gestao-os-014-atomico.sql"],
  ]) {
    const migration = readFileSync("db/migrations/" + filename,"utf8");
    const pacote = readFileSync("db/operacoes/" + packageName,"utf8");
    const hash = createHash("sha256").update(migration).digest("hex");
    assert.ok(pacote.includes(migration), number + " deve incorporar a migration integral");
    assert.ok(pacote.includes(hash), number + " deve registrar SHA-256 esperado");
    assert.match(pacote, /BEGIN;/);
    assert.match(pacote, /COMMIT;/);
    assert.match(pacote, /SET LOCAL lock_timeout/);
    assert.match(pacote, /SET LOCAL statement_timeout/);
    assert.match(pacote, /pg_try_advisory_xact_lock/);
  }
});

test("executor shell tem sintaxe válida e bloqueia parâmetros não aprovados", () => {
  const syntax = spawnSync("bash",["-n",shellScript],{encoding:"utf8"});
  assert.equal(syntax.status,0,syntax.stderr);
  for(const [mode,release,confirmation] of [
    ["aplicar","014","APLICAR_014_PRODUCAO_SEM_BACKUP"],
    ["aplicar","012",""],
    ["aplicar","013","APLICAR_012_PRODUCAO_SEM_BACKUP"],
    ["verificar","012","APLICAR_012_PRODUCAO_SEM_BACKUP"],
    ["aplicar","012","APLICAR_012_PRODUCAO_SEM_BACKUP"],
  ]) {
    const result=spawnSync("bash",[shellScript,mode,release,confirmation],{
      encoding:"utf8",
      env:{...process.env,GITHUB_REF:"refs/heads/insegura",RAILWAY_API_TOKEN:""},
    });
    assert.equal(result.status,2,mode + " " + release + " deve falhar na branch incorreta");
  }
});

test("modo aplicar exige frase exata mesmo na main, antes de qualquer acesso remoto", () => {
  for (const [modo, release, confirmacao] of [
    ["aplicar","012",""],
    ["aplicar","013","APLICAR_012_PRODUCAO_SEM_BACKUP"],
    ["verificar","013","APLICAR_013_PRODUCAO_SEM_BACKUP"],
    ["aplicar","014","APLICAR_012_PRODUCAO_SEM_BACKUP"],
    ["aplicar","014",""],
    ["verificar","014","APLICAR_014_PRODUCAO_SEM_BACKUP"],
  ]) {
    const result = spawnSync("bash",[shellScript,modo,release,confirmacao],{
      encoding:"utf8",
      env:{...process.env,GITHUB_REF:"refs/heads/main",RAILWAY_API_TOKEN:""},
    });
    assert.equal(result.status,2);
    assert.match(result.stderr,/BLOQUEIO/);
  }
});

test("modo verificar usa apenas SQL read-only; aplicar usa somente pacote autorizado", () => {
  const temp=mkdtempSync(path.join(tmpdir(),"gestao-railway-mock-"));
  try {
    const mock=path.join(temp,"railway");
    const state=path.join(temp,"state");
    const log=path.join(temp,"commands");
    const key=path.join(temp,"ci_ssh");
    writeFileSync(key,"test-only-key");
    writeFileSync(state,"11");
    writeFileSync(log,"");
    const fake = `#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\\n' "$*" >> "$MOCK_LOG"
if [[ "$*" == *"SELECT versao,checksum FROM gestao.schema_migrations ORDER BY versao"* ]]; then
  n="$(cat "$MOCK_STATE")"
  for f in db/migrations/[0-9][0-9][0-9]_*.sql; do
    num="$(basename "$f" | cut -c 1-3)"
    if (( 10#$num <= n )); then
      printf '%s|%s\\n' "$(basename "$f")" "$(sha256sum "$f" | cut -d ' ' -f 1)"
    fi
  done
elif [[ "$*" == *"-f -"* ]]; then
  sql="$(cat)"
  if [[ "$sql" == *"BEGIN TRANSACTION READ ONLY;"* ]]; then
    printf '%s\\n' "preflight QA somente leitura"
  elif [[ "$sql" == *"RELEASE MANUAL ATÔMICO 012"* ]]; then
    [[ "$(cat "$MOCK_STATE")" == "11" ]] || exit 1
    printf '12' > "$MOCK_STATE"
    printf '%s\\n' "COMMIT"
  elif [[ "$sql" == *"PACOTE MANUAL ATÔMICO 014"* ]]; then
    [[ "$(cat "$MOCK_STATE")" == "13" ]] || exit 1
    printf '14' > "$MOCK_STATE"
    printf '%s\\n' "COMMIT"
  else
    echo "BLOQUEIO: pacote fora do escopo" >&2
    exit 1
  fi
else
  echo "BLOQUEIO: comando inesperado" >&2
  exit 1
fi
`;
    writeFileSync(mock,fake);
    chmodSync(mock,0o700);
    const baseEnv = {
      ...process.env,
      GITHUB_REF:"refs/heads/main",
      RAILWAY_API_TOKEN:"token-falso-somente-ci",
      RAILWAY_GESTAO_IDENTITY_FILE:key,
      MOCK_STATE:state,MOCK_LOG:log,
      PATH:temp + path.delimiter + process.env.PATH,
    };
    const verificar=spawnSync("bash",[shellScript,"verificar","012",""],{
      encoding:"utf8",env:baseEnv,
    });
    assert.equal(verificar.status,0,verificar.stderr);
    assert.match(verificar.stdout,/11 migrations aplicadas/);
    assert.equal(readFileSync(state,"utf8"),"11");
    assert.ok(!readFileSync(log,"utf8").includes("RELEASE MANUAL"));
    const aplicar=spawnSync("bash",[shellScript,"aplicar","012","APLICAR_012_PRODUCAO_SEM_BACKUP"],{
      encoding:"utf8",env:baseEnv,
    });
    assert.equal(aplicar.status,0,aplicar.stderr);
    assert.match(aplicar.stdout,/12\/14/);
    assert.equal(readFileSync(state,"utf8"),"12");
    const repetir=spawnSync("bash",[shellScript,"aplicar","012","APLICAR_012_PRODUCAO_SEM_BACKUP"],{
      encoding:"utf8",env:baseEnv,
    });
    assert.equal(repetir.status,1,"reaplicação de 012 deve parar antes do pacote");
    assert.match(repetir.stderr,/exige exatamente 11 migrations/);

    // Simula o banco 013 real antes da aplicação da 014.
    writeFileSync(state,"13");
    writeFileSync(log,"");
    const verificar014=spawnSync("bash",[shellScript,"verificar","014",""],{
      encoding:"utf8",env:baseEnv,
    });
    assert.equal(verificar014.status,0,verificar014.stderr);
    assert.match(verificar014.stdout,/13 migrations aplicadas/);
    assert.equal(readFileSync(state,"utf8"),"13");
    assert.ok(!readFileSync(log,"utf8").includes("PACOTE MANUAL ATÔMICO"));

    const aplicar014=spawnSync("bash",[shellScript,"aplicar","014","APLICAR_014_PRODUCAO_SEM_BACKUP"],{
      encoding:"utf8",env:baseEnv,
    });
    assert.equal(aplicar014.status,0,aplicar014.stderr);
    assert.match(aplicar014.stdout,/14\/14/);
    assert.equal(readFileSync(state,"utf8"),"14");
    const repetir014=spawnSync("bash",[shellScript,"aplicar","014","APLICAR_014_PRODUCAO_SEM_BACKUP"],{
      encoding:"utf8",env:baseEnv,
    });
    assert.equal(repetir014.status,1,"reaplicar a 014 deve parar antes do pacote");
    assert.match(repetir014.stderr,/exige exatamente 13 migrations/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
