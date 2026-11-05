import assert from "node:assert/strict";
import test from "node:test";
import { origemConvitePermitida } from "../src/lib/gestao/origem-convite.ts";

test("convites aceitam apenas HTTPS na origem pública configurada", () => {
  const origin = "https://eletrotecnicogo.com.br";
  assert.equal(origemConvitePermitida(origin, "eletrotecnicogo.com.br", origin), true);
  assert.equal(origemConvitePermitida(origin, "eletrotecnicogo.com.br", undefined), false);
  assert.equal(origemConvitePermitida("http://eletrotecnicogo.com.br", "eletrotecnicogo.com.br", origin), false);
  assert.equal(origemConvitePermitida(origin, "evil.com", origin), false);
  assert.equal(origemConvitePermitida("https://evil.com", "evil.com", origin), false);
  assert.equal(origemConvitePermitida(origin, "eletrotecnicogo.com.br", "https://evil.com"), false);
  assert.equal(origemConvitePermitida(origin, "eletrotecnicogo.com.br", origin + "/outro"), false);
  assert.equal(origemConvitePermitida(origin, "eletrotecnicogo.com.br", origin + "?x=1"), false);
  assert.equal(origemConvitePermitida(origin, "eletrotecnicogo.com.br", origin + "#token"), false);
  assert.equal(origemConvitePermitida(origin + "/gestao", "eletrotecnicogo.com.br", origin), false);
  assert.equal(origemConvitePermitida(null, "eletrotecnicogo.com.br", origin), false);
  assert.equal(origemConvitePermitida(origin, null, origin), false);
});

test("aceita porta explícita apenas quando declarada (QA HTTPS)", () => {
  const origin = "https://localhost:3443";
  assert.equal(origemConvitePermitida(origin, "localhost:3443", origin), true);
  assert.equal(origemConvitePermitida(origin, "localhost:3443", "https://localhost"), false);
});
