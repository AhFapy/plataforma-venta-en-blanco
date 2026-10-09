import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Venta en Blanco · Trud Sales", template: "%s · Venta en Blanco" },
  description: "Plataforma de alumnos de Venta en Blanco",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f5f4ef", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("vb-theme")?.value;
  return (
    <html lang="es" data-theme={theme === "negro" || theme === "verde" ? theme : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
