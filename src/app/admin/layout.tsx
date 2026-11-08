import type { Metadata } from "next";
import "@/styles/admin.css";

export const metadata: Metadata = { title: { default: "Painel", template: "%s — Painel Brasília Iluminação" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return <div className="adm">{children}</div>;
}
