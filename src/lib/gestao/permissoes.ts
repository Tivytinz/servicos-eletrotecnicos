export type PapelGestao = "admin" | "comercial" | "tecnico";
export type AcaoGestao =
  | "clientes:ler" | "clientes:criar" | "leads:ler" | "leads:criar"
  | "orcamentos:gerir" | "os:gerir" | "financeiro:ler" | "financeiro:gerir";

const MATRIZ: Record<PapelGestao, readonly AcaoGestao[]> = {
  admin: [
    "clientes:ler", "clientes:criar", "leads:ler", "leads:criar",
    "orcamentos:gerir", "os:gerir", "financeiro:ler", "financeiro:gerir",
  ],
  comercial: ["clientes:ler", "clientes:criar", "leads:ler", "leads:criar", "orcamentos:gerir"],
  tecnico: ["clientes:ler", "leads:ler", "os:gerir"],
};

export function temPermissao(papeis: readonly PapelGestao[], acao: AcaoGestao): boolean {
  return papeis.some((papel) => MATRIZ[papel]?.includes(acao) ?? false);
}
