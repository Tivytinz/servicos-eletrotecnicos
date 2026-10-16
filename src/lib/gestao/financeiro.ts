/** Cálculos puros em centavos. Não registra lançamentos nem movimenta dinheiro. */
export type EntradaApuracao = {
  receitaCentavos: number;
  materiaisCentavos: number;
  kmMilimetros: number;
  tarifaCentavosKm?: number;
};

export type ResultadoApuracao = {
  deslocamentoCentavos: number;
  provisaoAnunciosCentavos: number;
  saldoDistribuivelCentavos: number;
  empresaCentavos: number;
  victorCentavos: number;
  carlosCentavos: number;
};

function inteiroSeguroNaoNegativo(valor: number, nome: string): void {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new RangeError(`${nome} deve ser inteiro não negativo e seguro`);
  }
}

function arredondarRazao(numerador: bigint, denominador: bigint): number {
  const resultado = (numerador + denominador / 2n) / denominador;
  if (resultado > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Valor excede o limite seguro");
  }
  return Number(resultado);
}

export function apurarRecebimento(entrada: EntradaApuracao): ResultadoApuracao {
  const tarifa = entrada.tarifaCentavosKm ?? 120;
  inteiroSeguroNaoNegativo(entrada.receitaCentavos, "receitaCentavos");
  inteiroSeguroNaoNegativo(entrada.materiaisCentavos, "materiaisCentavos");
  inteiroSeguroNaoNegativo(entrada.kmMilimetros, "kmMilimetros");
  inteiroSeguroNaoNegativo(tarifa, "tarifaCentavosKm");

  const deslocamentoCentavos = arredondarRazao(
    BigInt(entrada.kmMilimetros) * BigInt(tarifa), 1000n,
  );
  const provisaoAnunciosCentavos = arredondarRazao(
    BigInt(entrada.receitaCentavos) * 10n, 100n,
  );
  const saldoBig = BigInt(entrada.receitaCentavos)
    - BigInt(entrada.materiaisCentavos)
    - BigInt(deslocamentoCentavos)
    - BigInt(provisaoAnunciosCentavos);
  if (saldoBig > BigInt(Number.MAX_SAFE_INTEGER) || saldoBig < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("Saldo excede o limite seguro");
  }
  const saldoDistribuivelCentavos = Number(saldoBig);
  if (saldoDistribuivelCentavos <= 0) {
    return {
      deslocamentoCentavos, provisaoAnunciosCentavos, saldoDistribuivelCentavos,
      empresaCentavos: 0, victorCentavos: 0, carlosCentavos: 0,
    };
  }

  const empresaCentavos = arredondarRazao(saldoBig * 20n, 100n);
  const victorCentavos = arredondarRazao(saldoBig * 24n, 100n);
  // Carlos recebe o residual para conservar exatamente cada centavo.
  const carlosCentavos = saldoDistribuivelCentavos - empresaCentavos - victorCentavos;
  return {
    deslocamentoCentavos, provisaoAnunciosCentavos, saldoDistribuivelCentavos,
    empresaCentavos, victorCentavos, carlosCentavos,
  };
}
