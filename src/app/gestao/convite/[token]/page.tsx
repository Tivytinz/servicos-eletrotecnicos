import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Convite para a equipe",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function AceitarConvite() {
  // Bloqueado até existir validação de token, controle de abuso, grants mínimos
  // e aceite transacional testado via Server Action.
  redirect("/");
}
