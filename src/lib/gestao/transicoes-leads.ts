/** Transições explícitas do funil comercial; o PostgreSQL valida novamente. */
export const TRANSICOES_LEAD = {
  novo: ["qualificado", "perdido"],
  qualificado: ["orcamento_em_preparo", "perdido"],
  orcamento_em_preparo: ["orcamento_enviado", "perdido"],
  orcamento_enviado: ["aprovado", "recusado", "perdido"],
  aprovado: [],
  recusado: [],
  perdido: [],
} as const;

export type StatusLead = keyof typeof TRANSICOES_LEAD;

export function proximosStatusLead(status: string): readonly StatusLead[] {
  if (!Object.prototype.hasOwnProperty.call(TRANSICOES_LEAD, status)) return [];
  return TRANSICOES_LEAD[status as StatusLead];
}

export function transicaoLeadPermitida(atual: string, proximo: string): boolean {
  return proximosStatusLead(atual).some((status) => status === proximo);
}
