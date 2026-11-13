import "server-only";
import type { Section, SectionKey, Settings, ThreadStatus } from "@/entities/site-content";
import { hasSupabase } from "@/shared/api/supabase/env";
import type { AdminProject, AdminUser, AdminUserUpdate, UserProfileUpdate, Dashboard, ListItem, MediaItem, Me, Role, SectionRow, Thread, ThreadSummary } from "@/entities/admin";

/** Tudo o que o painel lê e grava. Duas implementações: Supabase (produção) e demonstração em memória. */
export interface AdminRepo {
  readonly mode: "supabase" | "demo";
  me(): Promise<Me | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;

  dashboard(): Promise<Dashboard>;
  log(text: string): Promise<void>;

  sections(): Promise<SectionRow[]>;
  reorderSections(keys: SectionKey[]): Promise<void>;
  saveSection(key: SectionKey, draft: Section, publish: boolean): Promise<void>;
  setSectionVisible(key: SectionKey, visible: boolean): Promise<void>;

  settings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;

  projects(): Promise<AdminProject[]>;
  project(id: string): Promise<AdminProject | null>;
  createProject(): Promise<string>;
  saveProject(p: AdminProject): Promise<void>;
  reorderProjects(ids: string[]): Promise<void>;
  setProjectStatus(id: string, status: AdminProject["status"]): Promise<void>;
  deleteProject(id: string): Promise<void>;

  media(): Promise<MediaItem[]>;
  mediaCategories(): Promise<string[]>;
  createMediaCategory(name: string): Promise<string>;
  addMedia(m: { url: string; key: string | null; width: number | null; height: number | null; alt: string; name?: string; category?: string; kind?: "image" | "video"; mimeType?: string }): Promise<MediaItem>;
  setMediaArchived(id: string, archived: boolean): Promise<void>;
  setMediaAlt(id: string, alt: string): Promise<void>;
  updateMediaMetadata(id: string, metadata: Pick<MediaItem, "name" | "category" | "alt">): Promise<void>;
  deleteMedia(id: string): Promise<{ key: string | null }>;

  list(kind: "testimonials" | "faqs"): Promise<ListItem[]>;
  deleteListItem(kind: "testimonials" | "faqs", id: string): Promise<void>;
  /** Updates existing rows; only explicit new IDs may be inserted. Never deletes. */
  saveList(kind: "testimonials" | "faqs", items: ListItem[], createIds?: readonly string[]): Promise<ListItem[]>;

  threads(): Promise<ThreadSummary[]>;
  thread(id: string): Promise<Thread | null>;
  markRead(id: string): Promise<void>;
  setThreadStatus(id: string, status: ThreadStatus): Promise<void>;
  addOutgoing(id: string, msg: { body: string; to: string; from: string; providerId: string | null; messageId: string; delivery: string; attachments: Array<{ name: string; url: string }> }): Promise<void>;

  users(): Promise<AdminUser[]>;
  updateUser(id: string, input: AdminUserUpdate): Promise<AdminUser>;
  updateOwnProfile(id: string, input: UserProfileUpdate): Promise<Me>;
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
