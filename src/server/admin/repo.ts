import "server-only";
import type { Section, SectionKey, Settings, ThreadStatus } from "@/lib/content/schema";
import { hasSupabase } from "@/lib/supabase/env";
import type { AdminProject, AdminUser, Dashboard, ListItem, MediaItem, Me, Role, SectionRow, Thread, ThreadSummary } from "./types";

/** Tudo o que o painel lê e grava. Duas implementações: Supabase (produção) e demonstração em memória. */
export interface AdminRepo {
  readonly mode: "supabase" | "demo";
  me(): Promise<Me | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;

  dashboard(): Promise<Dashboard>;
  log(text: string): Promise<void>;

  sections(): Promise<SectionRow[]>;
  saveSection(key: SectionKey, draft: Section, publish: boolean): Promise<void>;
  setSectionVisible(key: SectionKey, visible: boolean): Promise<void>;

  settings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;

  projects(): Promise<AdminProject[]>;
  project(id: string): Promise<AdminProject | null>;
  createProject(): Promise<string>;
  saveProject(p: AdminProject): Promise<void>;
  reorderProjects(ids: string[]): Promise<void>;
  deleteProject(id: string): Promise<void>;

  media(): Promise<MediaItem[]>;
  addMedia(m: { url: string; key: string | null; width: number | null; height: number | null; alt: string }): Promise<MediaItem>;
  setMediaAlt(id: string, alt: string): Promise<void>;
  deleteMedia(id: string): Promise<{ key: string | null }>;

  list(kind: "testimonials" | "faqs"): Promise<ListItem[]>;
  saveList(kind: "testimonials" | "faqs", items: ListItem[]): Promise<ListItem[]>;

  threads(): Promise<ThreadSummary[]>;
  thread(id: string): Promise<Thread | null>;
  markRead(id: string): Promise<void>;
  setThreadStatus(id: string, status: ThreadStatus): Promise<void>;
  addOutgoing(id: string, msg: { body: string; to: string; from: string; providerId: string | null; messageId: string; delivery: string; attachments: Array<{ name: string; url: string }> }): Promise<void>;

  users(): Promise<AdminUser[]>;
  invite(name: string, email: string, role: Role): Promise<void>;
}

/** Sem Supabase, o painel roda em modo demonstração (dados de exemplo em memória) — fora de produção ou com ADMIN_DEMO=1. */
export const demoAllowed = () => !hasSupabase && (process.env.NODE_ENV !== "production" || process.env.ADMIN_DEMO === "1");

export async function getRepo(): Promise<AdminRepo> {
  if (hasSupabase) return (await import("./repo-supabase")).supabaseRepo();
  if (demoAllowed()) return (await import("./repo-demo")).demoRepo();
  throw new Error("Painel indisponível: configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const initials = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
