import assert from "node:assert/strict";
import test from "node:test";
import { criarTokenConvite, hashTokenConvite, validarUsuarioConvite, convitePodeSerUsado } from "../src/lib/gestao/convites.ts";

test("convite tem segredo aleatório, hash estável e não aceita token malformado", () => {
  const a = criarTokenConvite();
  const b = criarTokenConvite();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
  assert.match(hashTokenConvite(a), /^[a-f0-9]{64}$/);
  assert.equal(hashTokenConvite(a), hashTokenConvite(a));
  assert.notEqual(hashTokenConvite(a), a);
  assert.throws(() => hashTokenConvite("invalido"));
});

test("identificador deve ser nome de usuário e não e-mail", () => {
  assert.equal(validarUsuarioConvite(" Carlos "), "carlos");
  assert.equal(validarUsuarioConvite("email@teste.com"), null);
  assert.equal(validarUsuarioConvite("a"), null);
});

test("convite só pode ser usado antes de expirar, sem revogação/consumo", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const valido = { expira_em: new Date("2026-10-18T12:00:00Z"), usado_em: null, revogado_em: null };
  assert.equal(convitePodeSerUsado(valido, now), true);
  assert.equal(convitePodeSerUsado({ ...valido, expira_em: now }, now), false);
  assert.equal(convitePodeSerUsado({ ...valido, usado_em: now }, now), false);
  assert.equal(convitePodeSerUsado({ ...valido, revogado_em: now }, now), false);
});
