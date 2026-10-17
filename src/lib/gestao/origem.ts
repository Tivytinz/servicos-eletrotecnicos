/** Validação adicional de origem para ações sensíveis da gestão. */
export function origemPermitida(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.host === host;
  } catch {
    return false;
  }
}
