/** Nome de usuário simples ou e-mail legado, sempre normalizado. */
export function normalizarIdentificador(entrada: string): string | null {
  const valor = entrada.trim().toLowerCase();
  if (valor.length > 254) return null;
  if (/^[a-z][a-z0-9_.-]{2,31}$/.test(valor)) return valor;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return valor;
  return null;
}
