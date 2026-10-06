import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://eletrotecnicogo.com.br";

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/limpeza-de-placas-solares`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
