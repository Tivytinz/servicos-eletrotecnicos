/** Valores de orçamento são armazenados em centavos inteiros; jamais usar float para persistência. */
export function parseValorOrcamento(valor: string): bigint | null {
  const texto = valor.trim();
  if (!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(texto)) return null;
  const [inteiros, centavos = ""] = texto.replace(",", ".").split(".");
  const resultado = BigInt(inteiros) * 100n + BigInt(centavos.padEnd(2, "0") || "0");
  return resultado > 0n && resultado <= 9999999999n ? resultado : null;
}

export function dataISOValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(valor + "T00:00:00.000Z");
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
});

export function formatarValorOrcamento(centavos: string | number): string {
  const valor = String(centavos);
  if (!/^\d{1,10}$/.test(valor)) return "Valor indisponível";
  return MOEDA.format(Number(valor) / 100);
}

export function formatarValidadeOrcamento(data: Date | string): string {
  // A validade em PostgreSQL é o início do dia SEGUINTE em São Paulo.
  const instante = new Date(data).getTime();
  if (!Number.isFinite(instante)) return "Data indisponível";
  return DATA.format(new Date(instante - 1));
}

export type OrcamentoResumo = {
  id: string; lead_id: string; cliente_nome: string; versao: number;
  status: string; valor_centavos: string; descricao: string;
  validade_em: Date; criado_em: Date;
};
