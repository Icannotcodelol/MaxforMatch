import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max for Mätch - Deep-Tech Startup Entdeckung",
  description: "Entdecke frühe Deep-Tech Startups in der DACH-Region",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        {/* Copernicus font from Labor and Wait via Fontdue */}
        {/* Replace with your licensed CSS embed URL */}
        <link
          href="https://fonts.fontdue.com/laborandwait/css/Rm9udENvbGxlY3Rpb246MTQ4MzU5ODAxNjAzMTMwOTA1OA%3D%3D.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
