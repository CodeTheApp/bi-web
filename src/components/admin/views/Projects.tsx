"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { GalleryLayout } from "@/lib/content/schema";
import { createProject, deleteProject, getProject, getProjects, reorderProjects, saveProject } from "@/server/admin/actions";
import type { AdminProject } from "@/server/admin/types";
import { Icon } from "../icons";
import { DropZone, MediaPicker } from "../media";
import { Grip, SortableItem, SortableList } from "../Sortable";
import { Chip, ErrorBox, Modal, PageHead, Seg, Skeleton, unwrap, useToast } from "../ui";

export function NewProjectButton({ className = "btn pri" }: { className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => unwrap(createProject()),
    onSuccess: (id) => router.push(`/admin/projetos/${id}`),
    onError: (e) => toast(e.message),
  });
  return (
    <button className={className} onClick={() => m.mutate()} disabled={m.isPending}>
      <Icon name="plus" />
      Novo projeto
    </button>
  );
}

export function ProjectList() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["projects"], queryFn: () => unwrap(getProjects()) });
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
  const create = useMutation({ mutationFn: () => unwrap(createProject()), onSuccess: (id) => router.push(`/admin/projetos/${id}`), onError: (e) => toast(e.message) });

  return (
    <>
      <PageHead title="Projetos" sub="Arraste os cards para mudar a ordem do portfólio no site.">
        <NewProjectButton />
      </PageHead>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? (
        <div className="pcards">{[0, 1, 2].map((i) => <Skeleton key={i} h={300} />)}</div>
      ) : (
        <SortableList
          grid
          items={list}
          getId={(p) => p.id}
          onMove={(next) => {
            setOrder(next);
            reorder.mutate(next.map((p) => p.id));
          }}
        >
          <div className="pcards">
            {list.map((p, i) => (
              <SortableItem key={p.id} id={p.id} className="card pc" onClick={() => router.push(`/admin/projetos/${p.id}`)}>
                <div className="im" style={{ backgroundImage: p.cover ? `url("${p.cover}")` : undefined }}>
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
            <button className="card pc add" onClick={() => create.mutate()} disabled={create.isPending}>
              <span className="row">
                <Icon name="plus" />
                Novo projeto
              </span>
            </button>
          </div>
        </SortableList>
      )}
    </>
  );
}

const CATS = ["Residencial", "Comercial", "Corporativo", "Paisagismo"];
type G = AdminProject["gallery"][number] & { _id: string };
let gseq = 0;

export function ProjectEditor({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["project", id], queryFn: () => unwrap(getProject(id)) });
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
  const [gal, setGal] = useState<G[]>(() => initial.gallery.map((g) => ({ ...g, _id: `g${++gseq}` })));
  const [dirty, setDirty] = useState(false);
  const [scopeIn, setScopeIn] = useState("");
  const [picker, setPicker] = useState<null | "cover" | "gallery">(null);
  const [confirm, setConfirm] = useState(false);

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
  const payload = (status: AdminProject["status"]): AdminProject => ({ ...p, status, gallery: gal.map(({ url, alt, layout }) => ({ url, alt, layout })) });

  const save = useMutation({
    mutationFn: (status: AdminProject["status"]) => unwrap(saveProject(payload(status))),
    onSuccess: (_d, status) => {
      setP((x) => ({ ...x, status }));
      setDirty(false);
      toast(status === "publicado" ? "Projeto publicado no portfólio" : "Rascunho salvo");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", p.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e) => toast(e.message),
  });
  const del = useMutation({
    mutationFn: () => unwrap(deleteProject(p.id)),
    onSuccess: () => {
      setDirty(false);
      toast("Projeto excluído");
      qc.invalidateQueries({ queryKey: ["projects"] });
      router.push("/admin/projetos");
    },
    onError: (e) => toast(e.message),
  });

  const slug = p.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const addScope = () => {
    const v = scopeIn.trim();
    if (v && !p.scope.includes(v)) set("scope", [...p.scope, v]);
    setScopeIn("");
  };

  return (
    <>
      <div className="ph">
        <div>
          <Link className="btn ghost sm" href="/admin/projetos" style={{ marginLeft: -10 }}>
            <Icon name="back" />
            Projetos
          </Link>
          <h1 style={{ marginTop: 6 }}>{p.title || "Sem título"}</h1>
        </div>
        <div className="row">
          <Chip s={p.status} />
          {dirty && <span className="muted" style={{ fontSize: 12 }}>Alterações não salvas</span>}
          {initial.status === "publicado" && (
            <a className="btn sec" href={`/projetos/${initial.slug}`} target="_blank" rel="noopener">
              <Icon name="eye" />
              Ver no site
            </a>
          )}
          <button className="btn sec" disabled={save.isPending} onClick={() => save.mutate("rascunho")}>
            Salvar rascunho
          </button>
          <button className="btn dark" disabled={save.isPending} onClick={() => save.mutate("publicado")}>
            <Icon name="check" />
            {p.status === "publicado" ? "Atualizar publicação" : "Publicar"}
          </button>
        </div>
      </div>

      <div className="ped">
        <div className="stack">
          <div className="card pad stack">
            <label className="f">
              Título
              <input className="in" value={p.title} onChange={(e) => set("title", e.target.value)} />
            </label>
            <div className="grid2">
              <label className="f">
                Categoria
                <select className="in" value={p.category} onChange={(e) => set("category", e.target.value)}>
                  {(CATS.includes(p.category) ? CATS : [p.category, ...CATS]).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="f">
                Ano
                <input className="in" value={p.year} inputMode="numeric" onChange={(e) => set("year", e.target.value)} />
              </label>
            </div>
            <label className="f">
              Local
              <input className="in" value={p.location} onChange={(e) => set("location", e.target.value)} />
            </label>
            <label className="f">
              Texto do projeto<small>Aparece em destaque na página do projeto e no portfólio</small>
              <textarea className="in" value={p.summary} onChange={(e) => set("summary", e.target.value)} rows={4} />
            </label>
            <div className="f" style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, fontSize: 12.5 }}>
              Escopo<small className="hint">Enter para adicionar</small>
              <div className="chipsin">
                {p.scope.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                    <button type="button" aria-label={`Remover ${s}`} onClick={() => set("scope", p.scope.filter((x) => x !== s))}>
                      ×
                    </button>
                  </span>
                ))}
                <input
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
                arraste para ordenar · “largura cheia” e “em par” abrem a página; “faixa” vai para a faixa horizontal
              </span>
              <span className="sp" />
              <button className="btn sec sm" onClick={() => setPicker("gallery")}>
                <Icon name="plus" />
                Da biblioteca
              </button>
            </div>
            <SortableList grid items={gal} getId={(g) => g._id} onMove={setG}>
              <div className="gal">
                {gal.map((g, i) => (
                  <SortableItem key={g._id} id={g._id} className="gi" whole>
                    <div className="im" style={{ backgroundImage: `url("${g.url}")` }}>
                      {i === 0 && <span className="cv">Abertura</span>}
                      <span className="ord">{i + 1}</span>
                    </div>
                    <div className="bt" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <select value={g.layout} aria-label="Formato" onChange={(e) => setG(gal.map((x) => (x._id === g._id ? { ...x, layout: e.target.value as GalleryLayout } : x)))}>
                        <option value="cheia">Largura cheia</option>
                        <option value="par">Em par</option>
                        <option value="faixa">Faixa lateral</option>
                      </select>
                      <button title="Remover" aria-label="Remover foto" onClick={() => setG(gal.filter((x) => x._id !== g._id))}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </SortableItem>
                ))}
                <DropZone onDone={(ms) => setG([...gal, ...ms.map((m) => ({ url: m.url, alt: m.alt || p.title, layout: "faixa" as const, _id: `g${++gseq}` }))])} />
              </div>
            </SortableList>
          </div>
        </div>

        <div className="stack">
          <div className="card pad stack">
            <b>Capa</b>
            <div style={{ aspectRatio: "4/3", borderRadius: 12, background: p.cover ? `url("${p.cover}") center/cover` : "var(--bege-2)" }} />
            <button className="btn sec" onClick={() => setPicker("cover")}>
              <Icon name="image" />
              Trocar capa
            </button>
          </div>
          <div className="card pad stack">
            <b>Status</b>
            <Seg value={p.status} options={[["rascunho", "Rascunho"], ["publicado", "Publicado"]]} onChange={(s) => save.mutate(s)} />
            <small className="hint">Só projetos publicados aparecem no site.</small>
          </div>
          <div className="card pad stack">
            <b>Como aparece no Google</b>
            <div className="seo">
              <div className="u">brasiliailuminacao.com.br › projetos › {slug}</div>
              <div className="t">{p.title} — Brasília Iluminação</div>
              <div className="d">{(p.summary || "Escreva um texto para o projeto.").slice(0, 150)}</div>
            </div>
          </div>
          <button className="btn ghost" style={{ alignSelf: "flex-start", color: "#A33" }} onClick={() => setConfirm(true)}>
            <Icon name="trash" />
            Excluir projeto
          </button>
        </div>
      </div>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={(m) => {
          if (picker === "cover") set("cover", m.url);
          else {
            setG([...gal, { url: m.url, alt: m.alt || p.title, layout: "faixa", _id: `g${++gseq}` }]);
            toast("Foto adicionada à galeria");
          }
        }}
      />
      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 8 }}>
          Excluir “{p.title}”?
        </h2>
        <p className="muted">O projeto sai do portfólio. As fotos continuam na biblioteca.</p>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn sec" onClick={() => setConfirm(false)}>
            Cancelar
          </button>
          <button className="btn dark" style={{ background: "#A33" }} disabled={del.isPending} onClick={() => del.mutate()}>
            Excluir
          </button>
        </div>
      </Modal>
    </>
  );
}
