import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max for Mätch",
  description: "Hier sind 277 Gründe Max als Praktikant einzustellen",
  openGraph: {
    title: "Max for Mätch",
    description: "Hier sind 277 Gründe Max als Praktikant einzustellen",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Max for Mätch",
    description: "Hier sind 277 Gründe Max als Praktikant einzustellen",
  },
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
