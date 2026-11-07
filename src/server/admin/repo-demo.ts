import "server-only";
import { SECTION_KEYS, SECTION_NAMES, sectionSchema, settingsSchema } from "@/lib/content/schema";
import { seedContent } from "@/lib/content/seed";
import { slugify, type AdminRepo } from "./repo";
import type { AdminProject, AdminUser, ListItem, MediaItem, Message, SectionRow, Thread } from "./types";

/**
 * Modo demonstração: dados de exemplo em memória, para ver e testar o painel sem Supabase.
 * Some ao reiniciar o servidor. Nunca é usado em produção (ver demoAllowed).
 */
export type DemoStore = Store;
type Store = {
  sections: SectionRow[];
  settings: typeof seedContent.settings;
  projects: AdminProject[];
  media: Array<Omit<MediaItem, "uses">>;
  testimonials: ListItem[];
  faqs: ListItem[];
  threads: Thread[];
  users: AdminUser[];
  log: Array<{ at: string; text: string }>;
};

const H = 3600e3, D = 24 * H;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const uid = () => crypto.randomUUID();

function msg(direction: "in" | "out", ago: number, body: string, extra: Partial<Message> = {}): Message {
  return { id: uid(), direction, from: "", body, html: null, at: iso(ago), delivery: direction === "out" ? "entregue" : null, attachments: [], ...extra };
}

function thread(t: Omit<Thread, "lastAt" | "preview" | "lastOut">): Thread {
  const l = t.messages[t.messages.length - 1];
  return { ...t, lastAt: l.at, preview: l.body.slice(0, 160), lastOut: l.direction === "out" };
}

function seed(): Store {
  const imgs = [
    "hero", "apt-sala", "apt-2", "apt-3", "apt-4", "apt-5", "apt-cozinha", "bento", "bento-2", "bento-3", "bento-4", "bento-5", "bento-noite",
    "vip", "vip-lounge", "vip-2", "vip-3", "vip-4", "vip-5", "camila", "escada", "pendentes", "prod-1", "prod-2", "prod-3", "prod-4",
  ];
  const alts: Record<string, string> = { hero: "Sala de jantar com pendentes de vidro", camila: "Camila de Lelis", escada: "Escada helicoidal iluminada", pendentes: "Pendentes esféricos iluminados", bento: "Galeria Bento Viana", vip: "Sala VIP BRB", "apt-sala": "Sala do Apartamento J|R", "prod-1": "Luminária de mesa bronze" };
  return {
    sections: SECTION_KEYS.map((key) => ({ key, draft: seedContent.sections[key], published: seedContent.sections[key], status: key === "lumi" ? "rascunho" : "publicado" })),
    settings: { ...seedContent.settings },
    projects: seedContent.projects.map((p) => ({ id: p.id, slug: p.slug, title: p.title, category: p.category, location: p.location, year: p.year, summary: p.summary, scope: [...p.scope], cover: p.cover, status: p.status, gallery: p.gallery.map((g) => ({ ...g })) })),
    media: imgs.map((f, i) => ({ id: `m${i}`, url: `/img/${f}.jpg`, alt: alts[f] ?? "", width: null, height: null, createdAt: iso(i * H) })),
    testimonials: seedContent.testimonials.map((t) => ({ id: uid(), a: t.quote, b: t.author, c: t.location, visible: t.visible })),
    faqs: seedContent.faqs.map((f) => ({ id: uid(), a: f.question, b: f.answer, visible: f.visible })),
    threads: [
      thread({ id: "t1", name: "Mariana Costa", email: "mariana.costa@exemplo.com", phone: "(61) 99999-0001", city: "Brasília/DF", interest: "Projeto completo", source: "formulario", status: "novo", subject: "Casa nova no Lago Sul", unread: true,
        messages: [msg("in", 2 * H, "Olá! Estamos terminando a obra de uma casa no Lago Sul e gostaríamos de um projeto luminotécnico completo, já com os produtos. A entrega da obra está prevista para março.\n\nPodemos marcar uma conversa?")] }),
      thread({ id: "t2", name: "Rafael Antunes", email: "rafael.antunes@exemplo.com", phone: "", city: "Goiânia/GO", interest: "Só os produtos", source: "email", status: "novo", subject: "Lista de luminárias do meu arquiteto", unread: true,
        messages: [msg("in", 5 * H, "Boa tarde. Meu arquiteto já fez o projeto e mandou a lista de luminárias em anexo. Vocês conseguem orçar e entregar em Goiânia?", { attachments: [{ name: "lista-luminarias.pdf" }] })] }),
      thread({ id: "t3", name: "Juliana Prado", email: "juliana.prado@exemplo.com", phone: "(61) 99999-0003", city: "Park Way/DF", interest: "Paisagismo", source: "formulario", status: "andamento", subject: "Iluminação do jardim", unread: false,
        messages: [
          msg("in", 2 * D, "Oi, Camila! Tenho um jardim grande e à noite ele some. Queria entender como funciona um projeto só para a área externa."),
          msg("out", 2 * D - 3 * H, "Oi, Juliana! Que bom falar com você. Fazemos sim projetos só para paisagismo. Consegue me mandar algumas fotos do jardim de dia e à noite?", { delivery: "aberto" }),
          msg("in", D, "Mandei as fotos pelo WhatsApp. Pode ser quinta à tarde?"),
        ] }),
      thread({ id: "t4", name: "Studio Mendes Arquitetura", email: "contato@exemplo.com", phone: "", city: "Brasília/DF", interest: "Comercial", source: "email", status: "respondido", subject: "Loja na Asa Norte", unread: false,
        messages: [msg("in", 4 * D, "Estamos com uma loja de 120 m² na Asa Norte e queremos uma parceria para o luminotécnico."), msg("out", 4 * D - 5 * H, "Olá! Obrigada pelo contato. Podemos agendar uma visita à loja?")] }),
      thread({ id: "t5", name: "Pedro Lima", email: "pedro.lima@exemplo.com", phone: "", city: "Sudoeste/DF", interest: "Só o projeto", source: "formulario", status: "arquivado", subject: "Apartamento no Sudoeste", unread: false,
        messages: [msg("in", 12 * D, "Queria um orçamento para o projeto de um apartamento de 90 m²."), msg("out", 11 * D, "Olá, Pedro! Segue o orçamento conforme conversamos.", { delivery: "aberto" })] }),
    ],
    users: [
      { id: "u1", name: "Camila de Lelis", email: "camila@brasiliailuminacao.com.br", role: "admin", status: "Ativo" },
      { id: "u2", name: "Assistente", email: "atendimento@brasiliailuminacao.com.br", role: "editor", status: "Convite pendente" },
    ],
    log: [
      { at: iso(3 * H), text: "Rascunho salvo na seção Luminotécnico" },
      { at: iso(D), text: "Projeto Apartamento J|R publicado" },
      { at: iso(2 * D), text: "Resposta enviada para Juliana Prado" },
    ],
  };
}

const g = globalThis as unknown as { __biDemo?: Store };
const store = () => (g.__biDemo ??= seed());
const clone = <T,>(x: T): T => structuredClone(x);

export function demoRepo(): AdminRepo {
  const S = store();
  const summary = (t: Thread) => {
    const l = t.messages[t.messages.length - 1];
    t.lastAt = l.at;
    t.preview = l.body.slice(0, 160);
    t.lastOut = l.direction === "out";
    return { id: t.id, subject: t.subject, name: t.name, email: t.email, phone: t.phone, city: t.city, interest: t.interest, source: t.source, status: t.status, unread: t.unread, lastAt: t.lastAt, preview: t.preview, lastOut: t.lastOut };
  };
  const repo: AdminRepo = {
    mode: "demo",
    async me() {
      return { id: "u1", name: "Camila de Lelis", email: "camila@brasiliailuminacao.com.br", role: "admin" };
    },
    async signIn() {
      return null;
    },
    async signOut() {},

    async dashboard() {
      const ts = [...S.threads].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
      return {
        unread: S.threads.filter((t) => t.status === "novo").length,
        published: S.projects.filter((p) => p.status === "publicado").length,
        projects: S.projects.length,
        drafts: S.sections.filter((s) => s.status === "rascunho").length,
        media: S.media.length,
        mediaNoAlt: S.media.filter((m) => !m.alt).length,
        recent: ts.slice(0, 4).map(summary),
        log: S.log.slice(0, 6),
      };
    },
    async log(text) {
      S.log.unshift({ at: new Date().toISOString(), text });
      S.log = S.log.slice(0, 30);
    },

    sections: async () => clone(S.sections),
    async saveSection(key, draft, publish) {
      const r = S.sections.find((s) => s.key === key)!;
      r.draft = sectionSchema.parse(draft);
      r.status = publish ? "publicado" : "rascunho";
      if (publish) r.published = clone(r.draft);
    },
    async setSectionVisible(key, visible) {
      const r = S.sections.find((s) => s.key === key)!;
      r.draft.visible = visible;
      r.published.visible = visible;
    },

    settings: async () => clone(S.settings),
    async saveSettings(s) {
      S.settings = settingsSchema.parse(s);
    },

    projects: async () => clone(S.projects),
    project: async (id) => clone(S.projects.find((p) => p.id === id) ?? null),
    async createProject() {
      const id = uid();
      S.projects.push({ id, slug: `novo-projeto-${id.slice(0, 4)}`, title: "Novo projeto", category: "Residencial", location: "Brasília, DF", year: String(new Date().getFullYear()), summary: "", scope: ["Projeto luminotécnico"], cover: "/img/escada.jpg", status: "rascunho", gallery: [] });
      return id;
    },
    async saveProject(p) {
      const i = S.projects.findIndex((x) => x.id === p.id);
      if (i >= 0) S.projects[i] = { ...clone(p), slug: slugify(p.title) || p.slug };
    },
    async reorderProjects(ids) {
      S.projects.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    },
    async deleteProject(id) {
      S.projects = S.projects.filter((p) => p.id !== id);
    },

    async media() {
      return S.media.map((m) => ({
        ...m,
        uses: [
          ...S.projects.filter((p) => p.cover === m.url || p.gallery.some((x) => x.url === m.url)).map((p) => p.title),
          ...S.sections.filter((s) => s.draft.image === m.url || s.published.image === m.url).map((s) => SECTION_NAMES[s.key]),
        ],
      }));
    },
    async addMedia(m) {
      const item = { id: uid(), url: m.url, alt: m.alt, width: m.width, height: m.height, createdAt: new Date().toISOString() };
      S.media.unshift(item);
      return { ...item, uses: [] };
    },
    async setMediaAlt(id, alt) {
      const m = S.media.find((x) => x.id === id);
      if (m) m.alt = alt;
    },
    async deleteMedia(id) {
      S.media = S.media.filter((m) => m.id !== id);
      return { key: null };
    },

    list: async (kind) => clone(S[kind]),
    async saveList(kind, items) {
      S[kind] = clone(items);
      return clone(S[kind]);
    },

    threads: async () => [...S.threads].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).map(summary),
    thread: async (id) => clone(S.threads.find((t) => t.id === id) ?? null),
    async markRead(id) {
      const t = S.threads.find((x) => x.id === id);
      if (t) t.unread = false;
    },
    async setThreadStatus(id, status) {
      const t = S.threads.find((x) => x.id === id);
      if (t) t.status = status;
    },
    async addOutgoing(id, m) {
      const t = S.threads.find((x) => x.id === id);
      if (!t) return;
      t.messages.push(msg("out", 0, m.body, { from: m.from, delivery: m.delivery, attachments: m.attachments }));
      t.status = "respondido";
      t.unread = false;
    },

    users: async () => clone(S.users),
    async invite(name, email, role) {
      S.users.push({ id: uid(), name, email, role, status: "Convite pendente" });
    },
  };
  return repo;
}
