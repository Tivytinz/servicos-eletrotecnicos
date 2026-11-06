/** Consultas somente leitura para a tela inicial da gestão.
 * Necessitam apenas SELECT em gestao.clientes e gestao.leads.
 * Não consultar auditoria, senhas, sessões ou movimentações financeiras.
 */
export const SQL_RESUMO_GESTAO = `
  SELECT
    (SELECT count(*)::integer FROM gestao.clientes) AS clientes,
    count(*)::integer AS solicitacoes,
    count(*) FILTER (WHERE status = 'novo')::integer AS novas,
    count(*) FILTER (WHERE status = 'qualificado')::integer AS qualificadas,
    count(*) FILTER (WHERE status IN ('orcamento_em_preparo', 'orcamento_enviado'))::integer AS em_orcamento,
    count(*) FILTER (WHERE status = 'aprovado')::integer AS aprovadas
  FROM gestao.leads
`;

export const SQL_SOLICITACOES_RECENTES = `
  SELECT l.id, c.nome, l.descricao, l.status, l.origem, l.criado_em
  FROM gestao.leads l
  JOIN gestao.clientes c ON c.id = l.cliente_id
  ORDER BY l.criado_em DESC, l.id DESC
  LIMIT 5
`;

export type ResumoGestao = {
  clientes: number;
  solicitacoes: number;
  novas: number;
  qualificadas: number;
  em_orcamento: number;
  aprovadas: number;
};

export type SolicitacaoRecente = {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  origem: string;
  criado_em: Date;
};

const ROTULOS_STATUS: Readonly<Record<string, string>> = {
  novo: "Novo",
  qualificado: "Qualificado",
  orcamento_em_preparo: "Orçamento em preparo",
  orcamento_enviado: "Orçamento enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  perdido: "Perdido",
};

const ROTULOS_ORIGEM: Readonly<Record<string, string>> = {
  whatsapp: "WhatsApp",
  google_ads: "Google Ads",
  indicacao: "Indicação",
  site: "Site",
  outro: "Outro",
  nao_informada: "Não informada",
};

export function rotuloStatusLead(status: string): string {
  return ROTULOS_STATUS[status] ?? "Outro status";
}

export function rotuloOrigemLead(origem: string): string {
  return ROTULOS_ORIGEM[origem] ?? "Outra origem";
}
