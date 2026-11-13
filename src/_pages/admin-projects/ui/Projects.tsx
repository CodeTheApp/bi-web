"use client";
import { getProject, getProjects } from "@/shared/api/admin-reads";
import "./projects-responsive.css";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { ConfirmRemove } from "@/shared/ui/admin/ConfirmRemove";
import UndoButton from "@/shared/ui/kokonutui/undo-button";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { GalleryLayout } from "@/entities/site-content";
import { createProject, deleteProject, reorderProjects, saveProject, setProjectStatus } from "@/server/admin/actions";
import type { AdminProject } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import { DropZone, MediaPicker } from "@/features/media-library/client";
import { MediaLightbox } from "@/shared/ui/admin/MediaLightbox";
import { Grip, SortableItem, SortableList } from "@/shared/ui/admin/Sortable";
import {
  Chip,
  Choice,
  ErrorBox,
  PageHead,
  Skeleton,
  unwrap,
  useToast,
} from "@/shared/ui/admin/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

export function NewProjectButton() {
  const router = useRouter();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => unwrap(createProject()),
    onSuccess: (id) => router.push(`/admin/projetos/${id}`),
    onError: (e) => toast(e.message),
  });
  return (
    <Button onClick={() => m.mutate()} disabled={m.isPending}>
      <Icon name="plus" />
      Novo projeto
    </Button>
  );
}

export function ProjectList() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["projects"],
    queryFn: ({ signal }) => unwrap(getProjects({ signal })),
  });
  const [order, setOrder] = useState<AdminProject[] | null>(null);
  const list = order ?? q.data ?? [];
  const reorder = useMutation({
    mutationFn: (ids: string[]) => unwrap(reorderProjects(ids)),
    onSuccess: () => {
      toast("Ordem do portfólio salva");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => {
      setOrder(null);
      toast(e.message);
    },
  });
  const create = useMutation({
    mutationFn: () => unwrap(createProject()),
    onSuccess: (id) => router.push(`/admin/projetos/${id}`),
    onError: (e) => toast(e.message),
  });

  return (
    <>
      <PageHead
        title="Projetos"
        sub="Arraste os cards para mudar a ordem do portfólio no site."
      >
        <NewProjectButton />
      </PageHead>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? (
        <div className="pcards admin-projects-cards">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={300} />
          ))}
        </div>
      ) : (
        <SortableList
          grid
          className="pcards admin-projects-cards"
          items={list}
          getId={(p) => p.id}
          onMove={(next) => {
            setOrder(next);
            reorder.mutate(next.map((p) => p.id));
          }}
        >
          {list.map((p, i) => (
            <SortableItem
              key={p.id}
              value={p.id}
              className="card pc"
              onClick={() => router.push(`/admin/projetos/${p.id}`)}
            >
              <div
                className="im"
                style={{
                  backgroundImage: p.cover ? `url("${p.cover}")` : undefined,
                }}
              >
                <Chip s={p.status} />
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="bd">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.title}</b>
                  <small>
                    {p.category} · {p.location} · {p.gallery.length} fotos
                  </small>
                </div>
              </div>
              <Grip />
            </SortableItem>
          ))}
          <button
            className="card pc add"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            <span className="row">
              <Icon name="plus" />
              Novo projeto
            </span>
          </button>
        </SortableList>
      )}
    </>
  );
}

const CATS = ["Residencial", "Comercial", "Corporativo", "Paisagismo"];
type G = AdminProject["gallery"][number] & { _id: string };
let gseq = 0;

export function ProjectEditor({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["project", id],
    queryFn: ({ signal }) => unwrap(getProject(id, { signal })),
  });
  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data) return q.isFetched ? <NotFound /> : <Skeleton h={500} />;
  return <Form key={q.data.id} initial={q.data} />;
}

function NotFound() {
  return (
    <div className="card pad">
      <b>Projeto não encontrado.</b>
      <p className="muted">
        <Link href="/admin/projetos">Voltar para Projetos</Link>
      </p>
    </div>
  );
}

function Form({ initial }: { initial: AdminProject }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [p, setP] = useState<AdminProject>(initial);
  const [gal, setGal] = useState<G[]>(() =>
    initial.gallery.map((g) => ({ ...g, _id: `g${++gseq}` })),
  );
  const [dirty, setDirty] = useState(false);
  const [scopeIn, setScopeIn] = useState("");
  const [picker, setPicker] = useState<null | "cover" | "gallery">(null);
  const [pendingUnpublish, setPendingUnpublish] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [imagePreview, setImagePreview] = useState<number | null>(null);
  const previewImages = [
    ...(p.cover
      ? [
          {
            id: "cover",
            url: p.cover,
            name: `${p.title} · Capa`,
            alt: p.title,
            category: p.category,
          },
        ]
      : []),
    ...gal.map((photo, index) => ({
      id: photo._id,
      url: photo.url,
      name: `${p.title} · Foto ${index + 1}`,
      alt: photo.alt || p.title,
      category: p.category,
    })),
  ];

  // avisa antes de sair com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof AdminProject>(k: K, v: AdminProject[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const setG = (next: G[]) => {
    setGal(next);
    setDirty(true);
  };
  const payload = (status: AdminProject["status"]): AdminProject => ({
    ...p,
    status,
    gallery: gal.map(({ url, alt, layout }) => ({ url, alt, layout })),
  });

  const save = useMutation({
    mutationFn: (status: AdminProject["status"]) =>
      unwrap(saveProject(payload(status))),
    onSuccess: (_d, status) => {
      setP((x) => ({ ...x, status }));
      setDirty(false);
      toast(
        status === "publicado"
          ? "Projeto publicado no portfólio"
          : "Rascunho salvo",
      );
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", p.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e) => toast(e.message),
  });
  const unpublish = useMutation({
    mutationFn: () => unwrap(setProjectStatus(p.id, "rascunho")),
    onSuccess: () => {
      setP((current) => ({ ...current, status: "rascunho" }));
      toast("Projeto retirado do portfólio");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", p.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const del = useMutation({
    mutationFn: () => unwrap(deleteProject(p.id)),
    onSuccess: () => {
      setDirty(false);
      toast("Projeto excluído");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/admin/projetos");
    },
    onError: (e) => toast.error(e.message),
  });

  const slug = p.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const addScope = () => {
    const v = scopeIn.trim();
    if (v && !p.scope.includes(v)) set("scope", [...p.scope, v]);
    setScopeIn("");
  };

  return (
    <>
      <div className="ph admin-projects-heading">
        <div>
          <Link
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="/admin/projetos"
            style={{ marginLeft: -10 }}
          >
            <Icon name="back" />
            Projetos
          </Link>
          <h1 style={{ marginTop: 6 }}>{p.title || "Sem título"}</h1>
        </div>
        <div className="row admin-projects-actions">
          <Chip s={p.status} />
          {dirty && (
            <span className="muted" style={{ fontSize: 12 }}>
              Alterações não salvas
            </span>
          )}
          {initial.status === "publicado" && (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={`/projetos/${initial.slug}`}
              target="_blank"
              rel="noopener"
            >
              <Icon name="eye" />
              Ver no site
            </a>
          )}
          <Button
            variant="outline"
            disabled={save.isPending || unpublish.isPending || pendingUnpublish}
            onClick={() => save.mutate("rascunho")}
          >
            Salvar rascunho
          </Button>
          <ParticleButton
            variant="dark"
            disabled={save.isPending || unpublish.isPending || pendingUnpublish}
            pendingLabel="Publicando…"
            successLabel="Publicado"
            errorLabel="Falha ao publicar"
            onClick={() => save.mutateAsync("publicado")}
          >
            <Icon name="check" />
            {p.status === "publicado" ? "Atualizar publicação" : "Publicar"}
          </ParticleButton>
        </div>
      </div>

      <div className="ped admin-projects-editor">
        <div className="stack">
          <div className="card pad stack">
            <label className="f">
              Título
              <Input
                className="in"
                value={p.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
            <div className="grid2 field-grid">
              <div className="f admin-field">
                Categoria
                <Choice
                  label="Categoria"
                  value={p.category}
                  options={(CATS.includes(p.category)
                    ? CATS
                    : [p.category, ...CATS]
                  ).map((c) => [c, c] as [string, string])}
                  onChange={(v) => set("category", v)}
                />
              </div>
              <label className="f">
                Ano
                <Input
                  className="in"
                  value={p.year}
                  inputMode="numeric"
                  onChange={(e) => set("year", e.target.value)}
                />
              </label>
            </div>
            <label className="f">
              Local
              <Input
                className="in"
                value={p.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>
            <label className="f">
              Texto do projeto
              <small>
                Aparece em destaque na página do projeto e no portfólio
              </small>
              <Textarea
                className="in"
                value={p.summary}
                onChange={(e) => set("summary", e.target.value)}
                rows={4}
              />
            </label>
            <div className="f admin-field">
              Escopo<small className="hint">Enter para adicionar</small>
              <div className="chipsin">
                {p.scope.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                    <ConfirmRemove
                      label={`Remover ${s} do escopo`}
                      title={`Remover “${s}” do escopo?`}
                      description="O item será retirado do rascunho do projeto ao confirmar."
                      onConfirm={() => {
                        setP((current) => ({
                          ...current,
                          scope: current.scope.filter((item) => item !== s),
                        }));
                        setDirty(true);
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Remover ${s} do escopo`}
                      >
                        ×
                      </button>
                    </ConfirmRemove>
                  </span>
                ))}
                <input
                  aria-label="Adicionar item ao escopo"
                  value={scopeIn}
                  placeholder="Ex.: Automação de cenas"
                  onChange={(e) => setScopeIn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addScope();
                    }
                  }}
                  onBlur={addScope}
                />
              </div>
            </div>
          </div>

          <div className="card pad">
            <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
              <b>Galeria</b>
              <span className="muted" style={{ fontSize: 12 }}>
                arraste para ordenar · “largura cheia” e “em par” abrem a
                página; “faixa” vai para a faixa horizontal
              </span>
              <span className="sp" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPicker("gallery")}
              >
                <Icon name="plus" />
                Da biblioteca
              </Button>
            </div>
            <SortableList
              grid
              items={gal}
              getId={(g) => g._id}
              onMove={setG}
              className="gal"
            >
              {gal.map((g, i) => (
                <SortableItem key={g._id} value={g._id} className="gi">
                  <Grip
                    className="im"
                    style={{ backgroundImage: `url("${g.url}")` }}
                  >
                    {i === 0 && <span className="cv">Abertura</span>}
                    <span className="ord">{i + 1}</span>
                    <button
                      type="button"
                      className="media-preview-label gallery-enlarge"
                      aria-label={`Ampliar foto ${i + 1} de ${p.title}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setImagePreview(i + (p.cover ? 1 : 0));
                      }}
                    >
                      <Icon name="eye" />
                      Ampliar
                    </button>
                  </Grip>
                  <div className="bt">
                    <label className="f gallery-format-label">
                      Formato
                      <Choice<GalleryLayout>
                        label="Formato"
                        size="sm"
                        className="w-full min-w-0 flex-1 text-xs"
                        value={g.layout}
                        options={[
                          ["cheia", "Largura cheia"],
                          ["par", "Em par"],
                          ["faixa", "Faixa lateral"],
                        ]}
                        onChange={(v) =>
                          setG(
                            gal.map((x) =>
                              x._id === g._id ? { ...x, layout: v } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <ConfirmRemove
                      label="Remover foto da galeria"
                      title="Remover foto da galeria?"
                      description="A foto continua na biblioteca. Salve o projeto para aplicar a remoção da galeria."
                      onConfirm={() => {
                        setGal((current) =>
                          current.filter((image) => image._id !== g._id),
                        );
                        setDirty(true);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Remover foto da galeria"
                      >
                        <Icon name="trash" />
                      </Button>
                    </ConfirmRemove>
                  </div>
                </SortableItem>
              ))}
              <DropZone
                onDone={(ms) =>
                  setG([
                    ...gal,
                    ...ms.map((m) => ({
                      url: m.url,
                      alt: m.alt || p.title,
                      layout: "faixa" as const,
                      _id: `g${++gseq}`,
                    })),
                  ])
                }
              />
            </SortableList>
          </div>
        </div>

        <div className="stack">
          <div className="card pad stack">
            <b>Capa</b>
            <button
              type="button"
              className="project-cover-preview"
              disabled={!p.cover}
              aria-label={`Ampliar capa de ${p.title}`}
              onClick={() => setImagePreview(0)}
              style={{
                aspectRatio: "4/3",
                borderRadius: 12,
                background: p.cover
                  ? `url("${p.cover}") center/cover`
                  : "var(--bege-2)",
              }}
            >
              <span className="media-preview-label">
                <Icon name="eye" />
                Ampliar
              </span>
            </button>
            <Button variant="outline" onClick={() => setPicker("cover")}>
              <Icon name="image" />
              Trocar capa
            </Button>
          </div>
          <div className="card pad stack">
            <b>Status</b>
            <Chip s={p.status} />
            {p.status === "publicado" && (
              <UndoButton
                label="Despublicar"
                doneLabel="Projeto despublicado"
                disabled={save.isPending || unpublish.isPending}
                onAction={() => setPendingUnpublish(true)}
                onUndo={() => setPendingUnpublish(false)}
                onCommit={async () => {
                  try {
                    await unpublish.mutateAsync();
                  } finally {
                    setPendingUnpublish(false);
                  }
                }}
              />
            )}
            <small className="hint">
              Só projetos publicados aparecem no site.
            </small>
          </div>
          <div className="card pad stack">
            <b>Como aparece no Google</b>
            <div className="seo">
              <div className="u">
                brasiliailuminacao.com.br › projetos › {slug}
              </div>
              <div className="t">{p.title} — Brasília Iluminação</div>
              <div className="d">
                {(p.summary || "Escreva um texto para o projeto.").slice(
                  0,
                  150,
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            style={{ alignSelf: "flex-start", color: "#A33" }}
            disabled={save.isPending || unpublish.isPending || pendingUnpublish}
            onClick={() => setConfirm(true)}
          >
            <Icon name="trash" />
            Excluir projeto
          </Button>
        </div>
      </div>

      <MediaLightbox
        items={previewImages}
        index={imagePreview}
        onIndexChange={setImagePreview}
      />
      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={(m) => {
          if (picker === "cover") set("cover", m.url);
          else {
            setG([
              ...gal,
              {
                url: m.url,
                alt: m.alt || p.title,
                layout: "faixa",
                _id: `g${++gseq}`,
              },
            ]);
            toast("Foto adicionada à galeria");
          }
        }}
      />
      <AlertDialog
        open={confirm}
        onOpenChange={(value) => {
          if (!del.isPending) setConfirm(value);
        }}
      >
        <AlertDialogContent className="adm admin-popover rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[20px] font-semibold leading-tight tracking-tight">
              Excluir “{p.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O projeto sai do portfólio. As fotos continuam na biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>
              Cancelar
            </AlertDialogCancel>
            <HoldButton
              variant="red"
              disabled={del.isPending}
              holdingLabel="Continue pressionando…"
              completeLabel="Solicitado"
              resetAfter={1800}
              onHoldComplete={() => del.mutate()}
            >
              Segure para excluir
            </HoldButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
