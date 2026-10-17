import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { verificarSenha } from "../src/lib/gestao/sessao.ts";

const script = "scripts/gestao-bootstrap-admin-sql.mjs";
const senha = "Senha-forte-didatica-1234567890";

test("gera SQL atômico, com hash compatível e sem senha em texto", () => {
  const r = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, ADMIN_EMAIL: "  TESTE@EXEMPLO.COM  ", ADMIN_PASSWORD: senha },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /WITH novo_admin AS/);
  assert.match(r.stdout, /INSERT INTO gestao\.usuarios_papeis/);
  assert.match(r.stdout, /teste@exemplo\.com/);
  assert.doesNotMatch(r.stdout, /Senha-forte-didatica/);
  const hash = r.stdout.match(/scrypt\$16384\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}/)?.[0];
  assert.ok(hash);
  assert.equal(verificarSenha(senha, hash), true);
});

test("rejeita senha curta sem imprimir credenciais", () => {
  const r = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, ADMIN_EMAIL: "teste@exemplo.com", ADMIN_PASSWORD: "curta" },
  });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "");
  assert.doesNotMatch(r.stderr, /curta/);
});

test("rejeita e-mail inválido sem gerar SQL", () => {
  const r = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, ADMIN_EMAIL: "email-invalido", ADMIN_PASSWORD: senha },
  });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, "");
});
