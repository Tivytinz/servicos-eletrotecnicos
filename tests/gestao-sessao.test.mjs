import assert from "node:assert/strict";
import test from "node:test";
import {
  criarHashSenha, verificarSenha, criarTokenSessao, hashTokenSessao,
} from "../src/lib/gestao/sessao.ts";
import { temPermissao } from "../src/lib/gestao/permissoes.ts";

test("hash de senha e verificação não armazenam texto puro", () => {
  const hash = criarHashSenha("senha-longa-de-exemplo-2026");
  assert.equal(hash.includes("senha-longa"), false);
  assert.equal(verificarSenha("senha-longa-de-exemplo-2026", hash), true);
  assert.equal(verificarSenha("senha-incorreta", hash), false);
  assert.equal(verificarSenha("senha-longa-de-exemplo-2026", "registro-invalido"), false);
});

test("tokens de sessão aleatórios geram hash estável", () => {
  const a = criarTokenSessao();
  const b = criarTokenSessao();
  assert.notEqual(a, b);
  assert.equal(a.length, 43);
  assert.equal(hashTokenSessao(a), hashTokenSessao(a));
  assert.notEqual(hashTokenSessao(a), hashTokenSessao(b));
});

test("RBAC bloqueia acesso comercial ao financeiro", () => {
  assert.equal(temPermissao(["comercial"], "financeiro:ler"), false);
  assert.equal(temPermissao(["tecnico"], "leads:criar"), false);
  assert.equal(temPermissao(["admin"], "financeiro:gerir"), true);
});
