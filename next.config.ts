import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.eletrotecnicogo.com.br",
          },
        ],
        destination: "https://eletrotecnicogo.com.br/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
