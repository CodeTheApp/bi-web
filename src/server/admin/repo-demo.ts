import "server-only";
import { normalizeSettings, normalizeSectionOrder, SECTION_KEYS, SECTION_NAMES, sectionSchema } from "@/entities/site-content";
import { seedContent } from "@/entities/site-content";
import { canonicalMediaCategory, DEFAULT_MEDIA_CATEGORIES, initialMediaCategory, mediaCategories, mediaCategoryKey, mediaCategoryNameSchema, mediaName } from "@/entities/media";
import { sectionUsesMedia } from "@/entities/site-content";
import { slugify, type AdminRepo } from "./repo";
import type { AdminProject, AdminUser, ListItem, MediaItem, Message, SectionRow, Thread, Me } from "@/entities/admin";
import { getDemoDataMode, type DemoDataMode } from "@/server/demo-workspace";
import { publishAdminEvent } from "@/server/admin-events/event-bus";
import type { AdminLiveTopic } from "@/shared/model/admin-live";

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
  mediaCategoryNames?: string[];
  testimonials: ListItem[];
  faqs: ListItem[];
  threads: Thread[];
  users: AdminUser[];
  identity?: Me;
  usersSeedVersion?: number;
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
    sections: SECTION_KEYS.map((key) => ({ key, draft: structuredClone(seedContent.sections[key]), published: structuredClone(seedContent.sections[key]), status: key === "lumi" ? "rascunho" : "publicado" })),
    settings: { ...seedContent.settings },
    projects: seedContent.projects.map((p) => ({ id: p.id, slug: p.slug, title: p.title, category: p.category, location: p.location, year: p.year, summary: p.summary, scope: [...p.scope], cover: p.cover, status: p.status, gallery: p.gallery.map((g) => ({ ...g })) })),
    mediaCategoryNames: [...DEFAULT_MEDIA_CATEGORIES],
    media: imgs.map((f, i) => ({ id: `m${i}`, url: `/img/${f}.jpg`, name: mediaName({ url: `/img/${f}.jpg` }), category: initialMediaCategory(`/img/${f}.jpg`), alt: alts[f] ?? "", width: null, height: null, createdAt: iso(i * H) })),
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

const clone = <T,>(x: T): T => structuredClone(x);
const g = globalThis as unknown as { __biDemo?: Store; __biDemoEmpty?: Store };
const DEMO_ID = "u1";
const defaultIdentity: Me = { id: DEMO_ID, name: "Camila de Lelis", email: "camila@brasiliailuminacao.com.br", role: "admin" };
const currentUser = (store: Store): Me => {
  const user = store.users.find((row) => row.id === DEMO_ID) ?? store.identity ?? defaultIdentity;
  return { id: user.id, name: user.name, email: user.email, role: user.role, ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}) };
};

function seedUsers(store: Store) {
  if (store.usersSeedVersion === 1) return;
  const fixtures: AdminUser[] = [
    { id: "6b000001-0000-4000-8000-000000000001", name: "Beatriz Freitas · exemplo", email: "beatriz@demo.example", role: "editor", status: "Ativo" },
    { id: "6b000001-0000-4000-8000-000000000002", name: "Daniel Rocha · exemplo", email: "daniel@demo.example", role: "editor", status: "Ativo" },
    { id: "6b000001-0000-4000-8000-000000000003", name: "Luiza Nascimento · exemplo", email: "luiza@demo.example", role: "admin", status: "Ativo" },
    { id: "6b000001-0000-4000-8000-000000000004", name: "Gabriel Castro · exemplo", email: "gabriel@demo.example", role: "editor", status: "Convite pendente" },
    { id: "6b000001-0000-4000-8000-000000000005", name: "Carolina Nunes · exemplo", email: "carolina@demo.example", role: "editor", status: "Convite pendente" },
  ];
  for (const fixture of fixtures) if (!store.users.some((user) => user.id === fixture.id || user.email.toLowerCase() === fixture.email)) store.users.push(fixture);
  store.usersSeedVersion = 1;
}

/** Examples preserve the existing store. Empty lists and edits live in a separate workspace. */
export function getDemoAdminStore(mode: DemoDataMode = getDemoDataMode()): Store {
  if (mode === "examples") {
    const store = g.__biDemo ??= seed();
    seedUsers(store);
    return store;
  }
  if (!g.__biDemoEmpty) {
    const sections = SECTION_KEYS.map((key): SectionRow => {
      const empty = sectionSchema.parse({ visible: false });
      return { key, draft: clone(empty), published: clone(empty), status: "publicado" };
    });
    g.__biDemoEmpty = { sections, settings: clone(seedContent.settings), projects: [], media: [], mediaCategoryNames: [], testimonials: [], faqs: [], threads: [], users: [], log: [], identity: clone(currentUser(getDemoAdminStore("examples"))) };
  }
  return g.__biDemoEmpty;
}

export function demoRepo(): AdminRepo {
  const mode = getDemoDataMode();
  const S = getDemoAdminStore(mode);
  if (!S.mediaCategoryNames) {
    S.mediaCategoryNames = mediaCategories(S.media, DEFAULT_MEDIA_CATEGORIES);
    for (const media of S.media) {
      media.category = media.category?.trim()
        ? canonicalMediaCategory(media.category, S.mediaCategoryNames)
        : initialMediaCategory(media.url);
    }
  }
  // Keep existing drafts when new editable sections are introduced during development.
  const sectionRows = new Map(S.sections.map((row) => [row.key, row]));
  S.sections = normalizeSectionOrder(S.sections.map((row) => row.key)).map((key) => sectionRows.get(key) ?? {
    key, draft: clone(seedContent.sections[key]), published: clone(seedContent.sections[key]), status: "publicado",
  });
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
      return clone(currentUser(S));
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
    async reorderSections(keys) {
      const rows = new Map(S.sections.map((row) => [row.key, row]));
      S.sections = normalizeSectionOrder(keys).map((key) => rows.get(key)!);
    },
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

    settings: async () => clone(normalizeSettings(S.settings)),
    async saveSettings(s) {
      S.settings = normalizeSettings(s);
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
    async setProjectStatus(id, status) {
      const project = S.projects.find((item) => item.id === id);
      if (!project) throw new Error("Projeto não encontrado.");
      project.status = status;
    },
    async deleteProject(id) {
      S.projects = S.projects.filter((p) => p.id !== id);
    },

    async media() {
      return S.media.map((m) => ({
        ...m,
        name: mediaName(m),
        category: canonicalMediaCategory(m.category, S.mediaCategoryNames!),
        uses: [
          ...S.projects.filter((p) => p.cover === m.url || p.gallery.some((x) => x.url === m.url)).map((p) => p.title),
          ...S.sections.filter((section) => sectionUsesMedia(section, m.url)).map((section) => SECTION_NAMES[section.key]),
          ...S.users.filter((user) => user.avatarUrl === m.url).map((user) => `Avatar de ${user.name}`),
          ...(S.identity?.avatarUrl === m.url && !S.users.some((user) => user.id === S.identity!.id) ? [`Avatar de ${S.identity.name}`] : []),
        ],
      }));
    },
    async mediaCategories() {
      return [...S.mediaCategoryNames!].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    async createMediaCategory(name) {
      const clean = mediaCategoryNameSchema.parse(name);
      if (S.mediaCategoryNames!.some((category) => mediaCategoryKey(category) === mediaCategoryKey(clean))) throw new Error("Já existe uma categoria com esse nome.");
      S.mediaCategoryNames!.push(clean);
      return clean;
    },
    async addMedia(m) {
      const item = { kind: m.kind ?? "image" as const, mimeType: m.mimeType, archived: false, id: uid(), url: m.url, name: mediaName(m), category: canonicalMediaCategory(m.category, S.mediaCategoryNames!), alt: m.alt, width: m.width, height: m.height, createdAt: new Date().toISOString() };
      S.media.unshift(item);
      return { ...item, uses: [] };
    },
    async setMediaArchived(id, archived) {
      const media = S.media.find((item) => item.id === id);
      if (!media) throw new Error("Arquivo não encontrado.");
      media.archived = archived;
    },
    async setMediaAlt(id, alt) {
      const m = S.media.find((x) => x.id === id);
      if (m) m.alt = alt;
    },
    async updateMediaMetadata(id, metadata) {
      const media = S.media.find((item) => item.id === id);
      if (!media) throw new Error("Imagem não encontrada.");
      Object.assign(media, { ...metadata, category: canonicalMediaCategory(metadata.category, S.mediaCategoryNames!) });
    },
    async deleteMedia(id) {
      S.media = S.media.filter((m) => m.id !== id);
      return { key: null };
    },

    list: async (kind) => clone(S[kind]),
    async deleteListItem(kind, id) {
      S[kind] = S[kind].filter((item) => item.id !== id);
    },
    async saveList(kind, items, createIds = []) {
      const currentIds = new Set(S[kind].map((item) => item.id));
      const explicitCreates = new Set(createIds);
      const edits = items.filter((item) => currentIds.has(item.id) || explicitCreates.has(item.id));
      const editedIds = new Set(edits.map((item) => item.id));
      // Missing snapshot rows belong to other clients, so retain them. An ID
      // deleted by another client is updated only if it still exists.
      S[kind] = [...clone(edits), ...S[kind].filter((item) => !editedIds.has(item.id))];
      return clone(S[kind]);
    },

    threads: async () => [...S.threads].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).map(summary),
    thread: async (id) => clone(S.threads.find((t) => t.id === id) ?? null),
    async markRead(id) {
      const t = S.threads.find((x) => x.id === id);
      if (t?.unread) t.unread = false;
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
      if (S.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) throw new Error("Já existe um usuário com esse e-mail.");
      S.users.push({ id: uid(), name, email, role, status: "Convite pendente" });
    },
    async updateUser(id, input) {
      const user = S.users.find((row) => row.id === id);
      if (!user) throw new Error("Usuário não encontrado.");
      if (S.users.some((row) => row.id !== id && row.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Já existe um usuário com esse e-mail.");
      if (id === DEMO_ID && input.role !== "admin") throw new Error("Você não pode remover seu próprio acesso de administrador.");
      const activeAdmins = S.users.filter((row) => row.role === "admin" && row.status === "Ativo").length + (S.identity?.role === "admin" && !S.users.some((row) => row.id === S.identity!.id) ? 1 : 0);
      if (user.role === "admin" && input.role !== "admin" && activeAdmins <= 1) throw new Error("Mantenha pelo menos um administrador ativo.");
      Object.assign(user, clone(input));
      return clone(user);
    },
    async updateOwnProfile(id, input) {
      if (id !== DEMO_ID) throw new Error("Perfil não encontrado.");
      const user = S.users.find((row) => row.id === id);
      if (user) Object.assign(user, clone(input));
      else S.identity = { ...currentUser(S), ...clone(input) };
      return clone(currentUser(S));
    },
  };
  const changes: Partial<Record<keyof AdminRepo, readonly AdminLiveTopic[]>> = {
    log: ["activity"],
    reorderSections: ["sections"], saveSection: ["sections"], setSectionVisible: ["sections"],
    saveSettings: ["settings"],
    createProject: ["projects"], saveProject: ["projects"], reorderProjects: ["projects"],
    setProjectStatus: ["projects"], deleteProject: ["projects"],
    createMediaCategory: ["media"], addMedia: ["media"], setMediaArchived: ["media"],
    setMediaAlt: ["media"], updateMediaMetadata: ["media"], deleteMedia: ["media"],
    deleteListItem: ["lists"], saveList: ["lists"],
    markRead: ["threads"], setThreadStatus: ["threads"], addOutgoing: ["threads"],
    invite: ["users"], updateUser: ["users"], updateOwnProfile: ["users"],
  };
  for (const key of Object.keys(changes) as Array<keyof AdminRepo>) {
    const method = repo[key] as (...args: unknown[]) => Promise<unknown>;
    (repo as unknown as Record<string, unknown>)[key] = async (...args: unknown[]) => {
      // Reading an already-read thread must not create an invalidation/refetch loop.
      const changed = key !== "markRead" || S.threads.some((thread) => thread.id === args[0] && thread.unread);
      const result = await method.apply(repo, args);
      if (changed) publishAdminEvent(changes[key]!, mode);
      return result;
    };
  }
  return repo;
}
