import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fotos de perfil hasta 3 MB pasan por server action (límite por defecto: 1 MB)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
