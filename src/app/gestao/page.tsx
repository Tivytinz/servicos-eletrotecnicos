import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestão interna",
  robots: { index: false, follow: false },
};

export default function GestaoPage() {
  // Falha fechada: não publicar painel, login improvisado ou dados de clientes
  // antes de autenticação persistente, autorização e banco configurados.
  notFound();
}
