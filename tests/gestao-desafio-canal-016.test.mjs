import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  criarCodigoDesafioCanal,
  conferirCodigoDesafioCanal,
  hashCodigoDesafioCanal,
  MAX_TENTATIVAS_DESAFIO,
  PRAZO_DESAFIO_MS,
  prazoDesafioCanal,
} from "../src/lib/gestao/desafio-canal-016.ts";

test("016 base: desafio criptograficamente aleatório, 96 bits, 16 caracteres", () => {
  const codigos = new Set();
  for (let i = 0; i < 100; i++) {
    const codigo = criarCodigoDesafioCanal();
    assert.match(codigo, /^[A-Za-z0-9_-]{16}$/);
    codigos.add(codigo);
  }
  assert.equal(codigos.size, 100);
});

test("016 base: só hash SHA-256 deve ser persistido, sem segredo bruto", () => {
  const codigo = criarCodigoDesafioCanal();
  const hash = hashCodigoDesafioCanal(codigo);
  assert.ok(hash);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, createHash("sha256").update(codigo).digest("hex"));
  assert.ok(!hash.includes(codigo));
  assert.equal(conferirCodigoDesafioCanal(codigo, hash), true);
  assert.equal(conferirCodigoDesafioCanal(criarCodigoDesafioCanal(), hash), false);
});

test("016 base: entradas inválidas e hashes malformados falham fechados", () => {
  const codigo = criarCodigoDesafioCanal();
  const hash = hashCodigoDesafioCanal(codigo);
  for (const invalido of ["", "123456", "a".repeat(15), "a".repeat(17), "A!".repeat(8), "a".repeat(64), codigo + "\n"]) {
    assert.equal(hashCodigoDesafioCanal(invalido), null);
    assert.equal(conferirCodigoDesafioCanal(invalido, hash), false);
  }
  assert.equal(conferirCodigoDesafioCanal(codigo, "a".repeat(63)), false);
  assert.equal(conferirCodigoDesafioCanal(codigo, "A".repeat(64)), false);
  assert.equal(conferirCodigoDesafioCanal(codigo, ""), false);
});

test("016 base: prazo de 10 minutos e limite previsto de 5 tentativas", () => {
  const agora = new Date("2026-11-06T12:00:00.000Z");
  const expira = prazoDesafioCanal(agora);
  assert.equal(PRAZO_DESAFIO_MS, 600000);
  assert.equal(MAX_TENTATIVAS_DESAFIO, 5);
  assert.equal(expira.toISOString(), "2026-11-06T12:10:00.000Z");
  assert.notEqual(expira, agora);
  assert.throws(() => prazoDesafioCanal(new Date(NaN)), TypeError);
});
