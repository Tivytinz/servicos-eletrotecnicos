/** Checagem da origem pública fixa para ações sensíveis de convite.
 * A origem de implantação precisa ser explicitamente configurada no servidor.
 * Não confiar apenas no Host recebido na requisição.
 */
export function origemConvitePermitida(
  origin: string | null,
  host: string | null,
  configurada: string | undefined,
): boolean {
  if (!origin || !host || !configurada) return false;
  try {
    const solicitada = new URL(origin);
    const publica = new URL(configurada);
    return solicitada.protocol === "https:"
      && solicitada.origin === origin
      && solicitada.host === host
      && publica.protocol === "https:"
      && publica.username === "" && publica.password === ""
      && publica.pathname === "/" && publica.search === "" && publica.hash === ""
      && solicitada.origin === publica.origin;
  } catch {
    return false;
  }
}
