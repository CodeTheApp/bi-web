import type { GalleryLayout, Section, SectionKey, Settings, ThreadStatus } from "@/entities/site-content";

export type Role = "admin" | "editor";
export type Me = { id: string; name: string; email: string; role: Role; avatarUrl?: string };
export type UserProfileUpdate = { name: string; avatarUrl: string };
export type AdminUserUpdate = UserProfileUpdate & { email: string; role: Role };

export type SectionRow = { key: SectionKey; draft: Section; published: Section; status: "rascunho" | "publicado" };

export type AdminProject = {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  year: string;
  summary: string;
  scope: string[];
  cover: string;
  status: "rascunho" | "publicado";
  gallery: Array<{ url: string; alt: string; layout: GalleryLayout }>;
};

export type MediaItem = { kind?: "image" | "video"; mimeType?: string; archived?: boolean; id: string; url: string; name: string; category: string; alt: string; width: number | null; height: number | null; createdAt: string; uses: string[] };
export type MediaMetadata = Pick<MediaItem, "name" | "category" | "alt">;

export type ListItem = { id: string; a: string; b: string; c?: string; visible: boolean };

export type ThreadSummary = {
  id: string;
  subject: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  interest: string;
  source: "formulario" | "email";
  status: ThreadStatus;
  unread: boolean;
  lastAt: string;
  preview: string;
  lastOut: boolean;
};

export type Message = {
  id: string;
  direction: "in" | "out";
  from: string;
  body: string;
  html: string | null;
  at: string;
  delivery: string | null;
  attachments: Array<{ name: string; url?: string }>;
};

export type Thread = ThreadSummary & { messages: Message[] };

export type Dashboard = {
  unread: number;
  published: number;
  projects: number;
  drafts: number;
  media: number;
  mediaNoAlt: number;
  recent: ThreadSummary[];
  log: Array<{ at: string; text: string }>;
};

export type AdminUser = { id: string; name: string; email: string; role: Role; avatarUrl?: string; status: "Ativo" | "Convite pendente" };

export type { Settings, Section, SectionKey };
