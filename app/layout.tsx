import type { Metadata } from "next";
import {
  Archivo,
  EB_Garamond,
  Inter,
  Lato,
  Playfair_Display,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], style: ["normal", "italic"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], style: ["normal", "italic"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Planner",
  description: "Gerenciador de projetos pessoais",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${garamond.variable} ${inter.variable} ${lato.variable} ${playfair.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
