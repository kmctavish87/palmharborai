import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "CSC Creative Studio",
  description: "A non-destructive creative production workspace for CSC designers.",
  metadataBase: new URL("https://palmharborai.com"),
  robots: { index: false, follow: false },
  openGraph: {
    title: "CSC Creative Studio",
    description: "Brand-aware creative production, batch resizing, and protected asset export.",
    type: "website",
    url: "/csccreative/",
    images: [{ url: "/csccreative/csc-creative-og.png", width: 1200, height: 630, alt: "Layered marketing creative canvases" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
