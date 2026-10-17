"use server";

// A implementação completa exigirá entregar o token de modo confidencial e
// persistir o convite em operação controlada. Não gerar token que seria perdido.
export async function emitirConvite(_formData: FormData): Promise<void> {
  void _formData;
  throw new Error("Emissão de convites ainda não liberada. Aguarde a revisão de segurança.");
}
