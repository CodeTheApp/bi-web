import type { Metadata } from "next";
import { Belleza, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const belleza = Belleza({ weight: "400", subsets: ["latin"], variable: "--font-belleza", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brasiliailuminacao.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Brasília Iluminação — Projetos e produtos de iluminação", template: "%s — Brasília Iluminação" },
  description: "Projeto luminotécnico e curadoria de iluminação em Brasília, com entrega para todo o Brasil.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Brasília Iluminação", images: ["/img/hero.jpg"] },
  icons: { icon: "/img/bi-escuro.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={cn("no-js", belleza.variable, montserrat.variable)} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
