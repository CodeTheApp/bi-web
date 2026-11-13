import type { Metadata } from "next";
import { Belleza, Montserrat } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers/AppProviders";
import { cn } from "@/shared/lib/utils";
import { getContent } from "@/server/content";
import { siteMetadata } from "@/entities/site-content";

const belleza = Belleza({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-belleza",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brasiliailuminacao.com.br";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return { metadataBase: new URL(siteUrl), ...siteMetadata(settings) };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("no-js", belleza.variable, montserrat.variable)}
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
