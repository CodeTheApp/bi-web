"use server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ReplyEmail } from "@/emails/ContactEmails";
import { galleryLayout, mergeSettings, normalizeSettings, SECTION_KEYS, SECTION_NAMES, sectionSchema, THREAD_STATUS, type SectionKey, type ThreadStatus } from "@/entities/site-content";
import { EMAIL_FROM, hasEmail, sendEmail, threadReplyTo } from "@/server/email";
import { TAGS } from "@/server/content";
import { INLINE_UPLOAD_LIMIT, IMAGE_UPLOAD_TYPES, VIDEO_UPLOAD_TYPES, validateUpload, validateInlineMedia } from "@/shared/lib/upload-policy";
import { deleteObject, hasStorage, presignUpload, validateMediaStorageReference } from "@/server/storage";
import { getRepo } from "./repo";
import { canonicalMediaCategory, mediaCategoryNameSchema, mediaMetadataSchema } from "@/entities/media";
import { ctx, run, type Result } from "./guard";
import type { AdminProject, ListItem } from "@/entities/admin";
import { integrationStatus } from "./integration-status";

export type { Result };

// updateTag expira na hora: a próxima visita já vê o que foi publicado (revalidateTag serviria a versão antiga mais uma vez)
const publishSite = (...tags: string[]) => {
  tags.forEach((t) => updateTag(t));
  revalidatePath("/", "page");
};

/* ---------------- sessão ---------------- */
export async function signIn(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/admin");
  if (!email || !password) return { error: "Informe e-mail e senha." };
  const repo = await getRepo();
  const err = await repo.signIn(email, password);
  if (err) return { error: err };
  if (!(await repo.me())) {
    await repo.signOut();
    return { error: "Este usuário não tem acesso ao painel." };
  }
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOut() {
  const repo = await getRepo();
  await repo.signOut();
  redirect("/admin/login");
}

/* ---------------- leitura (usadas pelo TanStack Query) ---------------- */
export async function getDashboard() {
  return run(async () => {
    return (await ctx()).repo.dashboard();
  });
}
export async function getSections() {
  return run(async () => {
    const { repo } = await ctx();
    return { sections: await repo.sections() };
  });
}
export async function getProjects() {
  return run(async () => {
    return (await ctx()).repo.projects();
  });
}
export async function getProject(id: string) {
  return run(async () => {
    return (await ctx()).repo.project(id);
  });
}
export async function getMedia() {
  return run(async () => {
    return (await ctx()).repo.media();
  });
}
export async function getMediaCategories() {
  return run(async () => (await ctx()).repo.mediaCategories());
}
export async function getList(kind: "testimonials" | "faqs") {
  return run(async () => {
    return (await ctx()).repo.list(kind);
  });
}
export async function getThreads() {
  return run(async () => {
    return (await ctx()).repo.threads();
  });
}
export async function getThread(id: string) {
  return run(async () => {
    const { repo } = await ctx();
    const t = await repo.thread(id);
    if (t?.unread) await repo.markRead(id);
    return t ? { ...t, unread: false } : null;
  });
}
/** Explicit acknowledgement: private GET reads never mutate inbox state. */
export async function markThreadRead(id: string) {
  return run(async () => {
    const { repo } = await ctx();
    await repo.markRead(z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).parse(id));
  });
}
export async function getSettings() {
  return run(async () => {
    const { repo, me } = await ctx();
    const [settings, users] = await Promise.all([repo.settings(), me.role === "admin" ? repo.users() : Promise.resolve([])]);
    return { settings: normalizeSettings(settings), users, canEdit: me.role === "admin", me, integrations: integrationStatus(repo.mode === "demo") };
  });
}

/* ---------------- páginas ---------------- */
export async function reorderSections(keys: SectionKey[]) {
  return run(async () => {
    const { repo } = await ctx();
    if (keys.length !== SECTION_KEYS.length || new Set(keys).size !== SECTION_KEYS.length || keys.some((key) => !SECTION_KEYS.includes(key))) {
      throw new Error("A ordem deve incluir cada seção uma única vez.");
    }
    await repo.reorderSections(keys);
    await repo.log("Ordem das seções da home atualizada");
    publishSite(TAGS.content);
  });
}

export async function saveSection(key: SectionKey, draft: unknown, publish: boolean) {
  return run(async () => {
    const { repo } = await ctx();
    if (!SECTION_KEYS.includes(key)) throw new Error("Seção inválida.");
    const parsed = sectionSchema.parse(draft);
    await repo.saveSection(key, parsed, publish);
    await repo.log(publish ? `Seção ${SECTION_NAMES[key]} publicada` : `Rascunho salvo na seção ${SECTION_NAMES[key]}`);
    if (publish) publishSite(TAGS.content);
  });
}

export async function setSectionVisible(key: SectionKey, visible: boolean) {
  return run(async () => {
    const { repo } = await ctx();
    await repo.setSectionVisible(key, visible);
    await repo.log(`Seção ${SECTION_NAMES[key]} ${visible ? "exibida" : "ocultada"}`);
    publishSite(TAGS.content);
  });
}

/* ---------------- projetos ---------------- */
const projectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().trim().min(2, "Dê um título ao projeto").max(120),
  category: z.string().max(40),
  location: z.string().max(80),
  year: z.string().max(10),
  summary: z.string().max(1200),
  scope: z.array(z.string().max(60)).max(12),
  cover: z.string(),
  status: z.enum(["rascunho", "publicado"]),
  gallery: z.array(z.object({ url: z.string(), alt: z.string().max(200), layout: galleryLayout })).max(40),
});

export async function createProject() {
  return run(async () => {
    const { repo } = await ctx();
    const id = await repo.createProject();
    await repo.log("Novo projeto criado");
    return id;
  });
}

export async function saveProject(p: AdminProject) {
  return run(async () => {
    const { repo } = await ctx();
    const clean = projectSchema.parse(p);
    if (clean.status === "publicado" && !clean.cover) throw new Error("Escolha uma capa antes de publicar.");
    await repo.saveProject(clean);
    await repo.log(clean.status === "publicado" ? `Projeto ${clean.title} publicado` : `Rascunho salvo no projeto ${clean.title}`);
    publishSite(TAGS.projects, TAGS.content);
  });
}

export async function reorderProjects(ids: string[]) {
  return run(async () => {
    const { repo } = await ctx();
    await repo.reorderProjects(z.array(z.string()).parse(ids));
    await repo.log("Ordem do portfólio alterada");
    publishSite(TAGS.projects, TAGS.content);
  });
}

export async function deleteProject(id: string) {
  return run(async () => {
    const { repo } = await ctx();
    const p = await repo.project(id);
    await repo.deleteProject(id);
    await repo.log(`Projeto ${p?.title ?? ""} excluído`);
    publishSite(TAGS.projects, TAGS.content);
  });
}

/* ---------------- mídia ---------------- */
export async function createMediaCategory(name: string) {
  return run(async () => {
    const { repo } = await ctx();
    const created = await repo.createMediaCategory(mediaCategoryNameSchema.parse(name));
    await repo.log(`Categoria de mídia criada: ${created}`);
    return created;
  });
}

export async function createUpload(contentType: string, size: number) {
  return run(async () => {
    await ctx();
    const policy = validateUpload("midia", contentType, size);
    if (!hasStorage()) {
      // Images are resized again for inline mode; the final decoded payload is
      // checked by registerMedia. Videos cannot use that smaller-image fallback.
      if (policy.video && size > INLINE_UPLOAD_LIMIT) throw new Error("Sem S3, envie arquivos de até 2,5 MB. Configure o armazenamento para vídeos maiores.");
      return { mode: "inline" as const };
    } // demonstração: o navegador manda a imagem embutida
    return { mode: "s3" as const, ...(await presignUpload("midia", contentType, size)) };
  });
}

export async function registerMedia(input: { url: string; key: string | null; width: number | null; height: number | null; alt: string; name: string; kind?: "image" | "video"; mimeType?: string }) {
  return run(async () => {
    const { repo } = await ctx();
    const m = z.object({
      url: z.string().max(3500000).refine((value) => /^(?:https?:\/\/|\/img\/|data:(?:image|video)\/)/.test(value), "Endereço de arquivo inválido."),
      key: z.string().max(300).nullable(), width: z.number().int().positive().max(30000).nullable(), height: z.number().int().positive().max(30000).nullable(),
      alt: z.string().max(200), name: z.string().trim().min(1).max(120), kind: z.enum(["image", "video"]).default("image"), mimeType: z.string().optional(),
    }).parse(input);
    if (m.mimeType && !(m.kind === "video" ? VIDEO_UPLOAD_TYPES as readonly string[] : IMAGE_UPLOAD_TYPES as readonly string[]).includes(m.mimeType)) throw new Error("O formato não corresponde ao tipo do arquivo.");
    if (m.url.startsWith("data:")) {
      if (repo.mode !== "demo") throw new Error("Configure o S3 para enviar fotos.");
      if (m.key) throw new Error("Arquivos embutidos não têm chave S3.");
      const inline = validateInlineMedia(m.url, m.kind, m.mimeType);
      m.mimeType = inline.mimeType;
    }
    validateMediaStorageReference(m.url, m.key);
    const item = await repo.addMedia({ url: m.url, key: m.key, width: m.width, height: m.height, alt: m.alt.slice(0, 200), name: m.name.trim().slice(0, 120), category: "", kind: m.kind, mimeType: m.mimeType });
    await repo.log(`${m.kind === "video" ? "Vídeo enviado" : "Imagem enviada"}: ${m.name}`);
    return item;
  });
}

export async function setMediaAlt(id: string, alt: string) {
  return run(async () => {
    const { repo } = await ctx();
    await repo.setMediaAlt(id, alt.slice(0, 200));
  });
}

export async function saveMediaMetadata(id: string, metadata: unknown) {
  return run(async () => {
    const { repo } = await ctx();
    const parsed = mediaMetadataSchema.parse(metadata);
    parsed.category = canonicalMediaCategory(parsed.category, await repo.mediaCategories());
    await repo.updateMediaMetadata(id, parsed);
    return parsed;
  });
}

export async function setMediaArchived(id: string, archived: boolean) {
  return run(async () => {
    const { repo } = await ctx();
    z.string().min(1).max(100).parse(id); z.boolean().parse(archived);
    await repo.setMediaArchived(id, archived);
    await repo.log(archived ? "Arquivo arquivado na biblioteca" : "Arquivo restaurado na biblioteca");
  });
}

export async function setProjectStatus(id: string, status: "publicado" | "rascunho") {
  return run(async () => {
    const { repo } = await ctx();
    z.enum(["publicado", "rascunho"]).parse(status);
    const project = await repo.project(id);
    if (!project) throw new Error("Projeto não encontrado.");
    if (status === "publicado" && !project.cover) throw new Error("Escolha uma capa antes de publicar.");
    await repo.setProjectStatus(id, status);
    await repo.log(`Projeto ${project.title} ${status === "publicado" ? "publicado" : "despublicado"}`);
    publishSite(TAGS.projects, TAGS.content);
  });
}

export async function deleteMedia(id: string) {
  return run(async () => {
    const { repo } = await ctx();
    const all = await repo.media();
    const m = all.find((x) => x.id === id);
    if (m?.uses.length) throw new Error(`A foto está em uso em: ${m.uses.join(", ")}.`);
    const { key } = await repo.deleteMedia(id);
    if (key && hasStorage()) await deleteObject(key).catch((e) => console.error("[s3] falha ao apagar", e));
    await repo.log("Foto excluída da biblioteca");
  });
}

/* ---------------- depoimentos e FAQ ---------------- */
const listSchema = z.array(z.object({ id: z.string().uuid(), a: z.string().max(600), b: z.string().max(1200), c: z.string().max(80).optional(), visible: z.boolean() })).max(40);

/** A confirmed deletion removes one row atomically, never a stale list snapshot. */
export async function deleteListItem(kind: "testimonials" | "faqs", id: string, confirmedId: string) {
  return run(async () => {
    const { repo } = await ctx();
    z.enum(["testimonials", "faqs"]).parse(kind);
    z.string().uuid().parse(id);
    if (confirmedId !== id) throw new Error("Confirme o item que deseja excluir.");
    await repo.deleteListItem(kind, id);
    publishSite(TAGS.content);
    return repo.list(kind);
  });
}

export async function saveList(kind: "testimonials" | "faqs", items: ListItem[], creation?: { createIds?: string[] }) {
  return run(async () => {
    const { repo } = await ctx();
    if (kind !== "testimonials" && kind !== "faqs") throw new Error("Lista inválida.");
    const next = listSchema.parse(items);
    const createIds = z.object({ createIds: z.array(z.string().uuid()).max(40).default([]) }).optional().parse(creation)?.createIds ?? [];
    const ids = new Set(next.map((item) => item.id));
    if (ids.size !== next.length) throw new Error("A lista contém itens duplicados.");
    if (new Set(createIds).size !== createIds.length || createIds.some((id) => !ids.has(id))) throw new Error("Os itens novos não correspondem à lista enviada.");
    // Autosave is non-destructive, even for stale/legacy clients. Deletions are
    // possible only through deleteListItem and its explicit confirmation.
    const saved = await repo.saveList(kind, next, createIds);
    publishSite(TAGS.content);
    return saved;
  });
}

/* ---------------- mensagens ---------------- */
export async function setThreadStatus(id: string, status: ThreadStatus) {
  return run(async () => {
    const { repo } = await ctx();
    if (!THREAD_STATUS.includes(status)) throw new Error("Status inválido.");
    await repo.setThreadStatus(id, status);
    const t = await repo.thread(id);
    await repo.log(`Conversa com ${t?.name ?? ""} marcada como ${status}`);
  });
}

export async function createAttachmentUpload(contentType: string, size: number) {
  return run(async () => {
    await ctx();
    if (!hasStorage()) throw new Error("Configure o S3 para enviar anexos.");
    return presignUpload("anexos", contentType, size);
  });
}

export async function reply(id: string, body: string, attachments: Array<{ name: string; url: string }> = []) {
  return run(async () => {
    const { repo, me } = await ctx();
    const text = body.trim();
    if (!text) throw new Error("Escreva a resposta.");
    const t = await repo.thread(id);
    if (!t) throw new Error("Conversa não encontrada.");
    if (!t.email) throw new Error("Este contato não deixou e-mail. Responda pelo WhatsApp.");

    const domain = (process.env.EMAIL_FROM ?? "").match(/@([^>\s]+)/)?.[1] ?? "brasiliailuminacao.com.br";
    const messageId = `<${crypto.randomUUID()}@${domain}>`;
    const signed = attachments.length ? `${text}\n\nAnexos:\n${attachments.map((a) => `• ${a.name}: ${a.url}`).join("\n")}` : text;
    let providerId: string | null = null;
    let delivery = "enviado";
    if (repo.mode === "demo" || !hasEmail()) {
      delivery = "não enviado (e-mail não configurado)";
    } else {
      providerId = await sendEmail({
        to: t.email,
        subject: t.subject.startsWith("Re:") ? t.subject : `Re: ${t.subject}`,
        react: ReplyEmail({ body: signed }),
        replyTo: threadReplyTo(id),
        headers: { "Message-ID": messageId },
      });
      if (!providerId) throw new Error("O e-mail não saiu. Tente de novo em instantes.");
    }
    await repo.addOutgoing(id, { body: text, to: t.email, from: EMAIL_FROM(), providerId, messageId, delivery, attachments });
    await repo.log(`Resposta enviada para ${t.name} (por ${me.name})`);
  });
}

/* ---------------- configurações ---------------- */
export async function saveSettings(input: unknown) {
  return run(async () => {
    const { repo } = await ctx({ admin: true });
    const current = await repo.settings();
    const s = mergeSettings(current, input);
    await repo.saveSettings(s);
    await repo.log("Configurações atualizadas");
    publishSite(TAGS.content);
    revalidatePath("/", "layout");
    return s;
  });
}

export async function inviteUser(name: string, email: string, role: "admin" | "editor") {
  return run(async () => {
    const { repo } = await ctx({ admin: true });
    const data = z.object({ name: z.string().trim().min(2), email: z.string().trim().email("E-mail inválido"), role: z.enum(["admin", "editor"]) }).parse({ name, email, role });
    await repo.invite(data.name, data.email, data.role);
    await repo.log(`Convite enviado para ${data.email}`);
  });
}
