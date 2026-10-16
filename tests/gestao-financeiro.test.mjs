import assert from "node:assert/strict";
import test from "node:test";
import { apurarRecebimento } from "../src/lib/gestao/financeiro.ts";
import { podeTransicionarOS } from "../src/lib/gestao/estados.ts";

test("apuração conserva centavos e aplica 10% de anúncios, R$ 1,20/km e 20/24/56", () => {
  const r = apurarRecebimento({
    receitaCentavos: 100_000, materiaisCentavos: 15_000, kmMilesimos: 40_000,
  });
  assert.deepEqual(r, {
    deslocamentoCentavos: 4_800,
    provisaoAnunciosCentavos: 10_000,
    saldoDistribuivelCentavos: 70_200,
    empresaCentavos: 14_040,
    victorCentavos: 16_848,
    carlosCentavos: 39_312,
  });
});

test("arredondamento de centavos conserva o total distribuído", () => {
  const r = apurarRecebimento({
    receitaCentavos: 101, materiaisCentavos: 0, kmMilesimos: 0,
  });
  assert.equal(r.empresaCentavos + r.victorCentavos + r.carlosCentavos,
    r.saldoDistribuivelCentavos);
});

test("saldo negativo não cria distribuição positiva", () => {
  const r = apurarRecebimento({
    receitaCentavos: 1000, materiaisCentavos: 5000, kmMilesimos: 0,
  });
  assert.ok(r.saldoDistribuivelCentavos < 0);
  assert.equal(r.empresaCentavos + r.victorCentavos + r.carlosCentavos, 0);
});

test("não aceita valores negativos, fracionários ou inseguros", () => {
  for (const entrada of [
    { receitaCentavos: -1, materiaisCentavos: 0, kmMilesimos: 0 },
    { receitaCentavos: 1.5, materiaisCentavos: 0, kmMilesimos: 0 },
    { receitaCentavos: Number.MAX_SAFE_INTEGER + 1, materiaisCentavos: 0, kmMilesimos: 0 },
  ]) {
    assert.throws(() => apurarRecebimento(entrada), RangeError);
  }
});

test("conclusão e cancelamento são estados terminais", () => {
  assert.equal(podeTransicionarOS("aberta", "agendada"), true);
  assert.equal(podeTransicionarOS("agendada", "concluida"), false);
  assert.equal(podeTransicionarOS("concluida", "em_execucao"), false);
  assert.equal(podeTransicionarOS("cancelada", "aberta"), false);
});
