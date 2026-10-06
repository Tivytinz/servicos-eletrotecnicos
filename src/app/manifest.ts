import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fase Plena Elétrica",
    short_name: "Fase Plena Elétrica",
    description:
      "Serviços eletrotécnicos e limpeza de placas solares em Goiânia e região.",
    start_url: "/",
    display: "standalone",
    background_color: "#06101d",
    theme_color: "#06101d",
    lang: "pt-BR",
  };
}
