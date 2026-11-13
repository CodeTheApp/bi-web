import "server-only";
import { normalizeSettings, normalizeSectionOrder, SECTION_NAMES, sectionSchema, type SectionKey } from "@/entities/site-content";
import { seedSections } from "@/entities/site-content";
import type { Json } from "@/shared/api/supabase/database.types";
import { createSupabaseServer, createSupabaseService } from "@/shared/api/supabase/server";
import { slugify, type AdminRepo } from "./repo";
import type { AdminProject, MediaItem, Message, ThreadSummary } from "@/entities/admin";
import { canonicalMediaCategory, mediaCategoryKey, mediaCategoryNameSchema, mediaName } from "@/entities/media";
import { sectionUsesMedia } from "@/entities/site-content";
import { assertUserEditAllowed } from "@/features/manage-users";

type Db = Awaited<ReturnType<typeof createSupabaseServer>>;

function must<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
}

const parseSection = (j: Json, key: SectionKey) => {
  const r = sectionSchema.safeParse(j);
  return r.success ? r.data : seedSections[key];
};

type ThreadRow = {
  id: string; subject: string; contact_name: string; contact_email: string; contact_phone: string; city: string; interest: string;
  source: "formulario" | "email"; status: ThreadSummary["status"]; unread: boolean; last_message_at: string;
};

async function summaries(db: Db, rows: ThreadRow[]): Promise<ThreadSummary[]> {
  if (!rows.length) return [];
  // última mensagem de cada conversa (para a prévia)
  const msgs = must(
    await db.from("messages").select("thread_id, direction, body_text, created_at").in("thread_id", rows.map((r) => r.id)).order("created_at", { ascending: false }),
  );
  const lastBy = new Map<string, (typeof msgs)[number]>();
  for (const m of msgs) if (!lastBy.has(m.thread_id)) lastBy.set(m.thread_id, m);
  return rows.map((t) => {
    const l = lastBy.get(t.id);
    return {
      id: t.id, subject: t.subject, name: t.contact_name, email: t.contact_email, phone: t.contact_phone, city: t.city, interest: t.interest,
      source: t.source, status: t.status, unread: t.unread, lastAt: t.last_message_at, preview: l?.body_text.slice(0, 160) ?? "", lastOut: l?.direction === "out",
    };
  });
}

export async function supabaseRepo(): Promise<AdminRepo> {
  const db = await createSupabaseServer();

  const projectsWithGallery = async (filterId?: string): Promise<AdminProject[]> => {
    let q = db.from("projects").select("*").order("position");
    if (filterId) q = q.eq("id", filterId);
    const ps = must(await q);
    const imgs = ps.length ? must(await db.from("project_images").select("project_id, url, alt, layout, position").in("project_id", ps.map((p) => p.id)).order("position")) : [];
    return ps.map((p) => ({
      id: p.id, slug: p.slug, title: p.title, category: p.category, location: p.location, year: p.year, summary: p.summary, scope: p.scope,
      cover: p.cover_url, status: p.status,
      gallery: imgs.filter((g) => g.project_id === p.id).map((g) => ({ url: g.url, alt: g.alt, layout: g.layout })),
    }));
  };

  const repo: AdminRepo = {
    mode: "supabase",

    async me() {
      const { data } = await db.auth.getUser();
      if (!data.user) return null;
      const { data: prof } = await db.from("profiles").select("name, role, avatar_url").eq("id", data.user.id).maybeSingle();
      if (!prof) return null; // logado mas sem perfil: não é da equipe
      return { id: data.user.id, name: prof.name || data.user.email || "Equipe", email: data.user.email ?? "", role: prof.role, avatarUrl: prof.avatar_url };
    },
    async signIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      return error ? "E-mail ou senha incorretos." : null;
    },
    async signOut() {
      await db.auth.signOut();
    },

    async dashboard() {
      const [threads, projects, sections, media, log] = await Promise.all([
        db.from("threads").select("*").order("last_message_at", { ascending: false }),
        db.from("projects").select("status"),
        db.from("sections").select("status"),
        db.from("media").select("alt"),
        db.from("audit_log").select("action, created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      const ts = must(threads);
      const ps = must(projects);
      const ms = must(media);
      return {
        unread: ts.filter((t) => t.status === "novo").length,
        published: ps.filter((p) => p.status === "publicado").length,
        projects: ps.length,
        drafts: must(sections).filter((s) => s.status === "rascunho").length,
        media: ms.length,
        mediaNoAlt: ms.filter((m) => !m.alt).length,
        recent: await summaries(db, ts.slice(0, 4)),
        log: must(log).map((l) => ({ at: l.created_at, text: l.action })),
      };
    },
    async log(text) {
      const { data } = await db.auth.getUser();
      await db.from("audit_log").insert({ action: text, user_id: data.user?.id ?? null });
    },

    async sections() {
      const rows = must(await db.from("sections").select("key, draft, published, status").order("position"));
      return normalizeSectionOrder(rows.map((row) => row.key)).map((key) => {
        const r = rows.find((x) => x.key === key);
        return r
          ? { key, draft: parseSection(r.draft, key), published: parseSection(r.published, key), status: r.status }
          : { key, draft: seedSections[key], published: seedSections[key], status: "publicado" as const };
      });
    },
    async reorderSections(keys) {
      const rows = new Map((await repo.sections()).map((row) => [row.key, row]));
      const { data } = await db.auth.getUser();
      must(await db.from("sections").upsert(normalizeSectionOrder(keys).map((key, position) => {
        const row = rows.get(key)!;
        return {
          key, position, draft: row.draft as unknown as Json, published: row.published as unknown as Json, status: row.status,
          updated_at: new Date().toISOString(), updated_by: data.user?.id ?? null,
        };
      })));
    },
    async saveSection(key, draft, publish) {
      const existing = must(await db.from("sections").select("key").eq("key", key).maybeSingle());
      if (!existing) await repo.reorderSections((await repo.sections()).map((row) => row.key));
      const { data } = await db.auth.getUser();
      const clean = sectionSchema.parse(draft);
      const row = {
        draft: clean as unknown as Json, status: publish ? ("publicado" as const) : ("rascunho" as const),
        updated_at: new Date().toISOString(), updated_by: data.user?.id ?? null, ...(publish ? { published: clean as unknown as Json } : {}),
      };
      must(await db.from("sections").update(row).eq("key", key));
    },
    async setSectionVisible(key, visible) {
      const rows = await repo.sections();
      const r = rows.find((x) => x.key === key)!;
      const existing = must(await db.from("sections").select("key").eq("key", key).maybeSingle());
      if (!existing) await repo.reorderSections(rows.map((row) => row.key));
      must(
        await db.from("sections").update({
          status: r.status,
          draft: { ...r.draft, visible } as unknown as Json, published: { ...r.published, visible } as unknown as Json,
        }).eq("key", key),
      );
    },

    async settings() {
      const { data, error } = await db.from("settings").select("data").eq("id", 1).maybeSingle();
      if (error) throw new Error(error.message);
      return normalizeSettings(data?.data ?? {});
    },
    async saveSettings(s) {
      must(await db.from("settings").upsert({ id: 1, data: normalizeSettings(s) as unknown as Json, updated_at: new Date().toISOString() }));
    },

    projects: () => projectsWithGallery(),
    async project(id) {
      return (await projectsWithGallery(id))[0] ?? null;
    },
    async createProject() {
      const count = must(await db.from("projects").select("id")).length;
      const title = "Novo projeto";
      const row = must(
        await db
          .from("projects")
          .insert({ title, slug: `${slugify(title)}-${Date.now().toString(36)}`, year: String(new Date().getFullYear()), location: "Brasília, DF", scope: ["Projeto luminotécnico"], position: count })
          .select("id")
          .single(),
      );
      return row.id;
    },
    async saveProject(p) {
      // slug estável: só muda se o título mudar e o novo slug estiver livre
      const base = slugify(p.title) || "projeto";
      const taken = must(await db.from("projects").select("id").eq("slug", base).neq("id", p.id));
      const slug = taken.length ? `${base}-${p.id.slice(0, 4)}` : base;
      must(
        await db
          .from("projects")
          .update({ title: p.title, slug, category: p.category, location: p.location, year: p.year, summary: p.summary, scope: p.scope, cover_url: p.cover, status: p.status, updated_at: new Date().toISOString() })
          .eq("id", p.id),
      );
      must(await db.from("project_images").delete().eq("project_id", p.id));
      if (p.gallery.length)
        must(await db.from("project_images").insert(p.gallery.map((g, i) => ({ project_id: p.id, url: g.url, alt: g.alt || p.title, layout: g.layout, position: i }))));
    },
    async reorderProjects(ids) {
      await Promise.all(ids.map((id, i) => db.from("projects").update({ position: i }).eq("id", id)));
    },
    async setProjectStatus(id, status) {
      must(await db.from("projects").update({ status, updated_at: new Date().toISOString() }).eq("id", id));
    },
    async deleteProject(id) {
      must(await db.from("projects").delete().eq("id", id));
    },

    async media() {
      const [ms, ps, ss, categories, profiles] = await Promise.all([db.from("media").select("*").order("created_at", { ascending: false }), projectsWithGallery(), repo.sections(), repo.mediaCategories(), db.from("profiles").select("name, avatar_url")]);
      return must(ms).map((m): MediaItem => {
        const uses = [
          ...ps.filter((p) => p.cover === m.url || p.gallery.some((g) => g.url === m.url)).map((p) => p.title),
          ...ss.filter((section) => sectionUsesMedia(section, m.url)).map((section) => SECTION_NAMES[section.key]),
          ...must(profiles).filter((profile) => profile.avatar_url === m.url).map((profile) => `Avatar de ${profile.name || "usuário"}`),
        ];
        return { kind: m.kind ?? "image", mimeType: m.mime_type ?? undefined, archived: m.archived, id: m.id, url: m.url, name: mediaName(m), category: canonicalMediaCategory(m.category, categories), alt: m.alt, width: m.width, height: m.height, createdAt: m.created_at, uses };
      });
    },
    async mediaCategories() {
      return must(await db.from("media_categories").select("name").order("name")).map((category) => category.name);
    },
    async createMediaCategory(name) {
      const clean = mediaCategoryNameSchema.parse(name);
      const result = await db.from("media_categories").insert({ key: mediaCategoryKey(clean), name: clean }).select("name").single();
      if (result.error?.code === "23505") throw new Error("Já existe uma categoria com esse nome.");
      return must(result).name;
    },
    async addMedia(m) {
      const category = canonicalMediaCategory(m.category, await repo.mediaCategories());
      const r = must(await db.from("media").insert({ kind: m.kind ?? "image", mime_type: m.mimeType ?? null, archived: false, url: m.url, s3_key: m.key, width: m.width, height: m.height, alt: m.alt, name: m.name ?? "", category }).select("*").single());
      return { kind: r.kind, mimeType: r.mime_type ?? undefined, archived: r.archived, id: r.id, url: r.url, name: mediaName(r), category: r.category, alt: r.alt, width: r.width, height: r.height, createdAt: r.created_at, uses: [] };
    },
    async setMediaArchived(id, archived) {
      must(await db.from("media").update({ archived }).eq("id", id));
    },
    async setMediaAlt(id, alt) {
      must(await db.from("media").update({ alt }).eq("id", id));
    },
    async updateMediaMetadata(id, metadata) {
      const category = canonicalMediaCategory(metadata.category, await repo.mediaCategories());
      must(await db.from("media").update({ ...metadata, category }).eq("id", id));
    },
    async deleteMedia(id) {
      const r = must(await db.from("media").delete().eq("id", id).select("s3_key").single());
      return { key: r.s3_key };
    },

    async list(kind) {
      if (kind === "testimonials") {
        const rows = must(await db.from("testimonials").select("*").order("position"));
        return rows.map((t) => ({ id: t.id, a: t.quote, b: t.author, c: t.location, visible: t.visible }));
      }
      const rows = must(await db.from("faqs").select("*").order("position"));
      return rows.map((f) => ({ id: f.id, a: f.question, b: f.answer, visible: f.visible }));
    },
    async deleteListItem(kind, id) {
      must(await db.from(kind).delete().eq("id", id));
    },
    async saveList(kind, items, createIds = []) {
      const explicitCreates = new Set(createIds);
      const rows = kind === "testimonials"
        ? items.map((it, position) => ({ id: it.id, quote: it.a, author: it.b, location: it.c ?? "", visible: it.visible, position }))
        : items.map((it, position) => ({ id: it.id, question: it.a, answer: it.b, visible: it.visible, position }));
      const created = rows.filter((row) => explicitCreates.has(row.id));
      // INSERT ... ON CONFLICT DO NOTHING makes a retried creation idempotent.
      // No ordinary edit can INSERT a row that another client has deleted.
      if (created.length) {
        must(await db.from(kind).upsert(created as never, { onConflict: "id", ignoreDuplicates: true }));
      }
      for (const { id, ...edit } of rows) {
        must(await db.from(kind).update(edit).eq("id", id));
      }
      return repo.list(kind);
    },

    async threads() {
      return summaries(db, must(await db.from("threads").select("*").order("last_message_at", { ascending: false })));
    },
    async thread(id) {
      const t = must(await db.from("threads").select("*").eq("id", id).maybeSingle());
      if (!t) return null;
      const [s] = await summaries(db, [t]);
      const msgs = must(await db.from("messages").select("*").eq("thread_id", id).order("created_at"));
      return {
        ...s,
        messages: msgs.map(
          (m): Message => ({
            id: m.id, direction: m.direction, from: m.from_email, body: m.body_text, html: m.body_html, at: m.created_at, delivery: m.delivery,
            attachments: (Array.isArray(m.attachments) ? (m.attachments as Array<{ name: string; url?: string; id?: string; emailId?: string }>) : []).map((a) => ({
              name: a.name,
              url: a.url ?? (a.id && a.emailId ? `/api/email/anexo?email=${encodeURIComponent(a.emailId)}&id=${encodeURIComponent(a.id)}` : undefined),
            })),
          }),
        ),
      };
    },
    async markRead(id) {
      must(await db.from("threads").update({ unread: false }).eq("id", id));
    },
    async setThreadStatus(id, status) {
      must(await db.from("threads").update({ status }).eq("id", id));
    },
    async addOutgoing(id, m) {
      must(
        await db.from("messages").insert({
          thread_id: id, direction: "out", from_email: m.from, to_email: m.to, body_text: m.body, provider_id: m.providerId, message_id_header: m.messageId,
          delivery: m.delivery, attachments: m.attachments as unknown as Json,
        }),
      );
      must(await db.from("threads").update({ status: "respondido", unread: false, last_message_at: new Date().toISOString() }).eq("id", id));
    },

    async users() {
      const svc = createSupabaseService();
      const profs = must(await db.from("profiles").select("id, name, role, avatar_url").order("created_at"));
      const { data, error } = await svc.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw new Error(error.message);
      return profs.map((p) => {
        const u = data?.users.find((x) => x.id === p.id);
        return { id: p.id, name: p.name || u?.email || "—", email: u?.email ?? "", role: p.role, avatarUrl: p.avatar_url, status: u?.last_sign_in_at ? ("Ativo" as const) : ("Convite pendente" as const) };
      });
    },
    async updateOwnProfile(id, input) {
      const me = await repo.me();
      if (!me || me.id !== id) throw new Error("Só é possível editar o seu próprio perfil.");
      const result = await db.rpc("update_own_staff_profile", { p_name: input.name, p_avatar_url: input.avatarUrl });
      if (result.error) throw new Error(result.error.message);
      return { ...me, ...input };
    },
    async updateUser(id, input) {
      const actor = await repo.me();
      if (!actor || actor.role !== "admin") throw new Error("Só administradores podem editar usuários.");
      const users = await repo.users();
      const target = users.find((user) => user.id === id);
      if (!target) throw new Error("Usuário não encontrado.");
      assertUserEditAllowed(actor, target, input, users);
      const svc = createSupabaseService();
      const emailChanged = input.email.toLowerCase() !== target.email.toLowerCase();
      if (emailChanged) {
        const result = await svc.auth.admin.updateUserById(id, { email: input.email });
        if (result.error) throw new Error(result.error.message);
      }
      try {
        must(await svc.from("profiles").update({ name: input.name, role: input.role, avatar_url: input.avatarUrl }).eq("id", id).select("id").single());
      } catch (error) {
        if (emailChanged) {
          const rollback = await svc.auth.admin.updateUserById(id, { email: target.email });
          if (rollback.error) throw new Error("O perfil não foi salvo, mas o e-mail foi alterado. Atualize a lista e revise o usuário.");
        }
        throw error;
      }
      return { ...target, ...input };
    },
    async invite(name, email, role) {
      const svc = createSupabaseService();
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const { data, error } = await svc.auth.admin.inviteUserByEmail(email, { data: { name }, redirectTo: `${site}/admin/senha` });
      if (error || !data.user) throw new Error(error?.message ?? "Não foi possível convidar.");
      must(await svc.from("profiles").upsert({ id: data.user.id, name, role }));
    },
  };
  return repo;
}
