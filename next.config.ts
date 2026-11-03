import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos de perfil hasta 3 MB pasan por server action (límite por defecto: 1 MB)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // La primera entrada pasa por el onboarding de GHL (opt-in → workflow). Su paso 1
  // vuelve aquí con ?from=onboarding para no entrar en bucle.
  async redirects() {
    return [
      {
        source: "/solicitar-acceso",
        missing: [{ type: "query", key: "from" }],
        destination: "https://app.trudsales.com/onboarding-veb",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
