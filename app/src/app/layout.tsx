import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Yo Bonita | Cejas y Pestañas • Home Studio Recoleta",
  description:
    "Potenciá la belleza natural de tu mirada. Lifting, Brow Lamination y Perfilado en Recoleta, CABA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="font-sans antialiased selection:bg-oliva selection:text-white">
        {children}
      </body>
    </html>
  );
}
