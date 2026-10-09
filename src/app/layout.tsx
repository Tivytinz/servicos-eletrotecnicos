import type { Metadata } from "next";
import Analytics from "./analytics";
import WhatsAppSource from "./whatsapp-source";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://eletrotecnicogo.com.br"),
  title: {
    default: "Eletrotécnico em Goiânia e Região | Eletrotécnico GO",
    template: "%s | Eletrotécnico GO",
  },
  description:
    "Serviços eletrotécnicos em Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade. Instalação, manutenção elétrica, energia solar e limpeza de placas solares.",
  keywords: [
    "eletrotécnico Goiânia",
    "serviços elétricos Goiânia",
    "manutenção elétrica Goiânia",
    "limpeza de placas solares Goiânia",
    "energia solar Goiânia",
    "eletrotécnico Aparecida de Goiânia",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://eletrotecnicogo.com.br",
    siteName: "Eletrotécnico GO",
    title: "Eletrotécnico em Goiânia e Região | Eletrotécnico GO",
    description:
      "Serviços elétricos, manutenção e energia solar em Goiânia e cidades da região.",
    images: [
      {
        url: "/solar/depois-hq.webp",
        width: 1200,
        height: 900,
        alt: "Serviço de limpeza de placas solares realizado pelo Eletrotécnico GO",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eletrotécnico em Goiânia e Região | Eletrotécnico GO",
    description:
      "Serviços elétricos, manutenção e energia solar em Goiânia e cidades da região.",
    images: ["/solar/depois-hq.webp"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <WhatsAppSource />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
