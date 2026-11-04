/**
 * Fonte única do contato comercial público do Eletrotécnico GO.
 * Formato: DDI 55 + DDD (2 dígitos) + celular (9 dígitos), sem separadores.
 */
export const WHATSAPP_NUMERO = "5562996105841";
export const WHATSAPP_TELEFONE = `+${WHATSAPP_NUMERO}`;
export const WHATSAPP_FORMATADO =
  `(${WHATSAPP_NUMERO.slice(2, 4)}) ${WHATSAPP_NUMERO.slice(4, 9)}-${WHATSAPP_NUMERO.slice(9)}`;
export const WHATSAPP_TEL_HREF = `tel:${WHATSAPP_TELEFONE}`;

export function criarLinkWhatsApp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}
