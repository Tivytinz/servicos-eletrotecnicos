import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://eletrotecnicogo.com.br"),
  title: "Eletrotécnico em Goiânia e Região | Eletrotécnico GO",
  description:
    "Serviços eletrotécnicos em Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade. Solicite seu orçamento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
