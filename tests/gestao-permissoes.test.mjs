import assert from "node:assert/strict";
import test from "node:test";
import { temPermissao } from "../src/lib/gestao/permissoes.ts";

test("admin tem acesso às operações administrativas", () => {
  for (const acao of [
    "clientes:ler", "clientes:criar", "leads:ler", "leads:criar",
    "orcamentos:gerir", "os:gerir", "financeiro:ler", "financeiro:gerir",
  ]) {
    assert.equal(temPermissao(["admin"], acao), true, acao);
  }
});

test("comercial não acessa operações técnicas e financeiras", () => {
  for (const acao of ["clientes:ler", "clientes:criar", "leads:ler", "leads:criar", "orcamentos:gerir"]) {
    assert.equal(temPermissao(["comercial"], acao), true, acao);
  }
  for (const acao of ["os:gerir", "financeiro:ler", "financeiro:gerir"]) {
    assert.equal(temPermissao(["comercial"], acao), false, acao);
  }
});

test("técnico tem somente leitura comercial e gestão de OS", () => {
  for (const acao of ["clientes:ler", "leads:ler", "os:gerir"]) {
    assert.equal(temPermissao(["tecnico"], acao), true, acao);
  }
  for (const acao of ["clientes:criar", "leads:criar", "orcamentos:gerir", "financeiro:ler", "financeiro:gerir"]) {
    assert.equal(temPermissao(["tecnico"], acao), false, acao);
  }
});

test("nenhum perfil ou perfil desconhecido não autoriza acesso", () => {
  assert.equal(temPermissao([], "leads:ler"), false);
  assert.equal(temPermissao(["desconhecido"], "leads:ler"), false);
  assert.equal(temPermissao(["tecnico"], "leads:criar"), false);
});

test("permissões são cumulativas para usuários com múltiplos papéis", () => {
  assert.equal(temPermissao(["tecnico", "comercial"], "os:gerir"), true);
  assert.equal(temPermissao(["tecnico", "comercial"], "leads:criar"), true);
  assert.equal(temPermissao(["tecnico", "comercial"], "financeiro:gerir"), false);
});
