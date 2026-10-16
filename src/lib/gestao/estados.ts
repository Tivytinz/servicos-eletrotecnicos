/** Estados válidos para OS; transições devem ser verificadas também no servidor. */
export const TRANSICOES_OS = {
  aberta: ["agendada", "cancelada"],
  agendada: ["em_execucao", "pendente", "cancelada"],
  em_execucao: ["pendente", "concluida"],
  pendente: ["agendada", "em_execucao", "cancelada"],
  concluida: [],
  cancelada: [],
} as const;

export type EstadoOS = keyof typeof TRANSICOES_OS;

export function podeTransicionarOS(origem: EstadoOS, destino: EstadoOS): boolean {
  return (TRANSICOES_OS[origem] as readonly string[]).includes(destino);
}
