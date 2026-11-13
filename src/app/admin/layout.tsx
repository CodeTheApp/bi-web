import { AdminAppearanceBoot } from "@/features/admin-appearance/ui/AdminAppearanceBoot";
import type { Metadata } from "next";
import "@/styles/admin.css";
import "@/styles/admin-theme.css";

export const metadata: Metadata = { title: { default: "Painel", template: "%s — Painel Brasília Iluminação" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return <><AdminAppearanceBoot /><div className="adm adm-root">{children}</div></>;
}
