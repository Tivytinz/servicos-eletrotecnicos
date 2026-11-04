// Arquivo temporário: validação do bloqueio de merge por CI reprovado.
// PR exclusivamente de teste. NÃO INTEGRAR. Será encerrada após a verificação.
import test from "node:test";
import assert from "node:assert/strict";

test("simulação de CI reprovado para validar proteção da main", () => {
  assert.fail("FALHA INTENCIONAL: teste de ruleset — não realizar merge");
});
