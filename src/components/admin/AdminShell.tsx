"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getThreads, signOut } from "@/server/admin/actions";
import type { Me } from "@/server/admin/types";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Icon, type IconName } from "./icons";
import { ToastProvider, unwrap } from "./ui";

const ROUTES: Array<{ href: string; name: string; icon: IconName; sec?: string; admin?: boolean }> = [
  { href: "/admin", name: "Início", icon: "home" },
  { href: "/admin/paginas", name: "Páginas", icon: "pages" },
  { href: "/admin/projetos", name: "Projetos", icon: "folder" },
  { href: "/admin/midia", name: "Mídia", icon: "image" },
  { href: "/admin/depoimentos", name: "Depoimentos e FAQ", icon: "quote" },
  { href: "/admin/loja", name: "Produtos", icon: "tag", sec: "Loja" },
  { href: "/admin/loja/estoque", name: "Estoque", icon: "box" },
  { href: "/admin/mensagens", name: "Mensagens", icon: "mail", sec: "Atendimento" },
  { href: "/admin/config", name: "Configurações", icon: "cog", sec: "Conta" },
];

export function AdminShell({ me, demo, realtime, children }: { me: Me; demo: boolean; realtime: boolean; children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } } }));
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <Shell me={me} demo={demo} realtime={realtime}>
          {children}
        </Shell>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function Shell({ me, demo, realtime, children }: { me: Me; demo: boolean; realtime: boolean; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const threads = useQuery({ queryKey: ["threads"], queryFn: () => unwrap(getThreads()), refetchInterval: realtime ? false : 60_000 });
  const unread = threads.data?.filter((t) => t.status === "novo").length ?? 0;
  const current = ROUTES.slice().reverse().find((r) => (r.href === "/admin" ? path === "/admin" : path.startsWith(r.href))) ?? ROUTES[0];

  // fecha o menu lateral ao trocar de tela (no celular)
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setOpen(false);
  }

  // tempo real: mensagem nova chega sem recarregar
  useEffect(() => {
    if (!realtime) return;
    const sb = getSupabaseBrowser();
    const ch = sb
      .channel("painel-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "threads" }, () => {
        qc.invalidateQueries({ queryKey: ["threads"] });
        qc.invalidateQueries({ queryKey: ["thread"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .subscribe();
    return () => void sb.removeChannel(ch);
  }, [realtime, qc]);

  return (
    <div className={`app${open ? " nav-open" : ""}`}>
      <aside className="side">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lg" src="/img/logo-claro.svg" alt="Brasília Iluminação" />
        <nav>
          {ROUTES.map((r) => (
            <div key={r.href} style={{ display: "contents" }}>
              {r.sec && <div className="sec">{r.sec}</div>}
              <Link href={r.href} className={current.href === r.href ? "on" : undefined} aria-current={current.href === r.href ? "page" : undefined}>
                <Icon name={r.icon} />
                {r.name}
                {r.href === "/admin/mensagens" && unread > 0 && <span className="bd">{unread}</span>}
              </Link>
            </div>
          ))}
        </nav>
        <div className="me">
          <span className="av" style={{ background: "rgba(255,251,251,.12)", color: "var(--branco)" }}>
            {me.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <b>{me.name}</b>
            <small>{me.role === "admin" ? "Admin" : "Editor"}</small>
          </div>
          <form action={signOut} style={{ marginLeft: "auto" }}>
            <button title="Sair" aria-label="Sair" style={{ margin: 0 }}>
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <Button variant="ghost" className="burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            <Icon name="menu" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tlg" src="/img/logo-cor.svg" alt="Brasília Iluminação" />
          <div className="crumb">
            Painel / <b>{current.name}</b>
          </div>
          <label className="search">
            <Icon name="search" />
            <input
              placeholder="Buscar mensagens…"
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/admin/mensagens?q=${encodeURIComponent(e.currentTarget.value)}`);
              }}
            />
          </label>
          <a className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ver-site")} href="/" target="_blank" rel="noopener">
            <Icon name="ext" />
            Ver site
          </a>
        </header>
        {demo && (
          <div className="demo">
            <Alert variant="warning" className="border-0 bg-transparent p-0">
              <AlertTitle>Modo demonstração</AlertTitle>
              <AlertDescription>Sem Supabase configurado, os dados são de exemplo e somem ao reiniciar o servidor. E-mails não são enviados.</AlertDescription>
            </Alert>
          </div>
        )}
        <main className="view">{children}</main>
      </div>
    </div>
  );
}
