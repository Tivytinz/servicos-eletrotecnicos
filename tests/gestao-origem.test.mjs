import assert from "node:assert/strict";
import test from "node:test";
import { origemPermitida } from "../src/lib/gestao/origem.ts";

test("origem legítima HTTPS com host exato é aceita", () => {
  assert.equal(origemPermitida("https://eletrotecnicogo.com.br", "eletrotecnicogo.com.br"), true);
  assert.equal(origemPermitida("https://eletrotecnicogo.com.br:443", "eletrotecnicogo.com.br"), true);
});

test("requisições sem origem, de domínio diferente ou protocolo inseguro são rejeitadas", () => {
  const host = "eletrotecnicogo.com.br";
  for (const origin of [
    null, "", "http://eletrotecnicogo.com.br", "https://malicioso.com",
    "https://eletrotecnicogo.com.br.malicioso.com", "null", "not-a-url",
    "https://eletrotecnicogo.com.br:444",
  ]) {
    assert.equal(origemPermitida(origin, host), false, String(origin));
  }
  assert.equal(origemPermitida("https://eletrotecnicogo.com.br", null), false);
});
