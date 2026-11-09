"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SECTION_KEYS, SECTION_NAMES, type Section, type SectionKey } from "@/lib/content/schema";
import { getSections, saveSection, setSectionVisible } from "@/server/admin/actions";
import type { SectionRow } from "@/server/admin/types";
import { Icon } from "../icons";
import { MediaPicker } from "../media";
import { Grip, SortableItem, SortableList } from "../Sortable";
import { Chip, ErrorBox, PageHead, Skeleton, Switch, unwrap, useDebounced, useToast } from "../ui";

type Field = "label" | "title" | "title2" | "text" | "cta" | "image";
const FIELDS: Record<SectionKey, Field[]> = {
  hero: ["label", "title", "title2", "text", "cta", "image"],
  quem: ["label", "title", "text"],
  formas: ["label", "title", "text"],
  camila: ["label", "title", "text", "image"],
  lumi: ["label", "title", "text", "cta"],
  loja: ["label", "title", "text", "cta"],
  oferta: ["label", "title"],
  depoimentos: ["label"],
  faq: ["label", "title"],
  contato: ["label", "title", "title2", "text", "cta"],
};
const LABEL: Partial<Record<SectionKey, Partial<Record<Field, string>>>> = {
  hero: { title: "Título — linha 1", title2: "Título — linha 2 (dourado)", image: "Foto principal", cta: "Texto do botão (leva ao contato)" },
  quem: { title: "Manifesto — começo", text: "Manifesto — continuação" },
  camila: { title: "Nome", image: "Foto" },
  contato: { title: "Título", title2: "Final do título (âmbar)" },
};
const BASE: Record<Field, string> = { label: "Rótulo (acima do título)", title: "Título", title2: "Título — destaque", text: "Texto", cta: "Texto do botão", image: "Imagem" };
const HINT: Partial<Record<SectionKey, string>> = {
  quem: "Use *palavras* para destacar em âmbar e [foto:/img/arquivo.jpg|Legenda] para uma micro-foto no meio do texto.",
  camila: "Separe parágrafos com uma linha em branco. *palavras* ficam em negrito.",
};
const ITEMS: Partial<Record<SectionKey, { label: string; title: string; text?: string; hint?: string }>> = {
  quem: { label: "Números", title: "Número|unidade (ex.: 17|anos)", text: "Título — descrição", hint: "O número anima ao aparecer. Separe o título da descrição com “ — ”." },
  formas: { label: "Formas de trabalhar", title: "Título", text: "Descrição" },
  camila: { label: "Credenciais", title: "Credencial" },
  lumi: { label: "Etapas", title: "Etapa", text: "Descrição" },
  oferta: { label: "Serviços", title: "Título", text: "Descrição" },
};
const DARK: SectionKey[] = ["hero", "lumi", "depoimentos", "contato"];

type LocalItem = { _id: string; title: string; text: string };
let seq = 0;
const withIds = (s: Section) => s.items.map((it) => ({ ...it, _id: `i${++seq}` }));

export function Pages() {
  const q = useQuery({ queryKey: ["sections"], queryFn: () => unwrap(getSections()) });
  const [cur, setCur] = useState<SectionKey>("hero");

  return (
    <>
      <PageHead title="Páginas" sub="Edite os textos de cada seção da home. Nada muda no site até você publicar." />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? (
        <div className="pg">
          <Skeleton h={420} />
          <Skeleton h={420} />
          <Skeleton h={420} />
        </div>
      ) : (
        <div className="pg">
          <div className="card secs">
            {SECTION_KEYS.map((k) => {
              const r = q.data.sections.find((s) => s.key === k)!;
              const visible = r.draft.visible;
              return (
                <button key={k} className={k === cur ? "on" : undefined} onClick={() => setCur(k)}>
                  {SECTION_NAMES[k]}
                  <span className={`dot${!visible ? " h" : r.status === "rascunho" ? " d" : ""}`} title={!visible ? "Oculta" : r.status === "rascunho" ? "Rascunho" : "Publicada"} />
                </button>
              );
            })}
          </div>
          <Editor key={cur} row={q.data.sections.find((s) => s.key === cur)!} />
        </div>
      )}
    </>
  );
}

function Editor({ row }: { row: SectionRow }) {
  const key = row.key;
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Section>(row.draft);
  const [items, setItems] = useState<LocalItem[]>(() => withIds(row.draft));
  const [status, setStatus] = useState(row.status);
  const [saved, setSaved] = useState<string>(row.status === "rascunho" ? "Rascunho com alterações não publicadas" : "Igual ao site");
  const [picker, setPicker] = useState(false);
  const cfg = ITEMS[key];

  const current = (): Section => ({ ...draft, items: items.map(({ title, text }) => ({ title, text })) });

  const save = useMutation({
    mutationFn: ({ s, publish }: { s: Section; publish: boolean }) => unwrap(saveSection(key, s, publish)),
    onSuccess: (_d, { publish }) => {
      setStatus(publish ? "publicado" : "rascunho");
      setSaved(publish ? "Publicado. O site atualiza em segundos." : "Rascunho salvo automaticamente");
      if (publish) toast("Publicado. O site atualiza em segundos.");
      qc.invalidateQueries({ queryKey: ["sections"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => {
      setSaved("Não foi possível salvar");
      toast(e.message);
    },
  });
  const autosave = useDebounced((s: Section) => save.mutate({ s, publish: false }), 900);
  const touch = (nextDraft: Section, nextItems = items) => {
    setStatus("rascunho");
    setSaved("Salvando rascunho…");
    autosave({ ...nextDraft, items: nextItems.map(({ title, text }) => ({ title, text })) });
  };
  const setField = (f: Field, v: string) => {
    const d = { ...draft, [f]: v };
    setDraft(d);
    touch(d);
  };
  const setItemsAndSave = (next: LocalItem[]) => {
    setItems(next);
    touch(draft, next);
  };

  const visible = useMutation({
    mutationFn: (v: boolean) => unwrap(setSectionVisible(key, v)),
    onSuccess: (_d, v) => {
      toast(v ? "Seção exibida no site" : "Seção ocultada do site");
      qc.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (e, v) => {
      setDraft((d) => ({ ...d, visible: !v }));
      toast(e.message);
    },
  });

  const s = current();
  return (
    <>
      <div className="card editor">
        <div className="hd">
          <b style={{ fontSize: 15 }}>{SECTION_NAMES[key]}</b>
          <Chip s={draft.visible ? status : "oculto"} />
          <span className="sp" />
          <span className="muted" style={{ fontSize: 12 }}>
            Mostrar no site
          </span>
          <Switch
            checked={draft.visible}
            title="Mostrar no site"
            onChange={(v) => {
              setDraft((d) => ({ ...d, visible: v }));
              visible.mutate(v);
            }}
          />
        </div>
        <div className="bd">
          {HINT[key] && <p className="hint">{HINT[key]}</p>}
          {FIELDS[key].map((f) =>
            f === "image" ? (
              <div className="f" key={f} style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, fontSize: 12.5 }}>
                {LABEL[key]?.[f] ?? BASE[f]}
                <div className="row">
                  {draft.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.image} alt="" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  <Button variant="outline" size="sm" type="button" onClick={() => setPicker(true)}>
                    <Icon name="image" />
                    Trocar imagem
                  </Button>
                </div>
              </div>
            ) : (
              <label className="f" key={f}>
                {LABEL[key]?.[f] ?? BASE[f]}
                {f === "text" || (f === "title" && (draft.title.length > 40 || key === "quem")) ? (
                  <Textarea className="in" value={draft[f]} onChange={(e) => setField(f, e.target.value)} rows={f === "text" ? 5 : 3} />
                ) : (
                  <Input className="in" value={draft[f]} onChange={(e) => setField(f, e.target.value)} />
                )}
              </label>
            ),
          )}
          {cfg && (
            <>
              <div className="row" style={{ marginTop: 6 }}>
                <b>{cfg.label}</b>
                <span className="muted" style={{ fontSize: 12 }}>
                  arraste para reordenar
                </span>
                <span className="sp" />
                <Button variant="ghost" size="sm" type="button" disabled={items.length >= 8} onClick={() => setItemsAndSave([...items, { _id: `i${++seq}`, title: "Novo item", text: "" }])}>
                  <Icon name="plus" />
                  Adicionar
                </Button>
              </div>
              {cfg.hint && <p className="hint">{cfg.hint}</p>}
              <SortableList items={items} getId={(i) => i._id} onMove={setItemsAndSave} className="stack">
                  {items.map((it, i) => (
                    <SortableItem key={it._id} value={it._id} className="item">
                      <div className="row">
                        <Grip />
                        <span className="ih">Item {i + 1}</span>
                        <span className="sp" />
                        <Button variant="ghost" size="sm" type="button" title="Remover" aria-label="Remover item" onClick={() => setItemsAndSave(items.filter((x) => x._id !== it._id))}>
                          <Icon name="trash" />
                        </Button>
                      </div>
                      <Input className="in" placeholder={cfg.title} value={it.title} onChange={(e) => setItemsAndSave(items.map((x) => (x._id === it._id ? { ...x, title: e.target.value } : x)))} />
                      {cfg.text && (
                        <Textarea className="in" placeholder={cfg.text} style={{ minHeight: 60 }} value={it.text} onChange={(e) => setItemsAndSave(items.map((x) => (x._id === it._id ? { ...x, text: e.target.value } : x)))} />
                      )}
                    </SortableItem>
                  ))}
              </SortableList>
            </>
          )}
        </div>
        <div className="ft">
          <span className="muted" style={{ fontSize: 12, alignSelf: "center" }} role="status">
            {saved}
          </span>
          <span className="sp" />
          <Button variant="outline" type="button" disabled={save.isPending} onClick={() => save.mutate({ s: current(), publish: false })}>
            Salvar rascunho
          </Button>
          <Button variant="dark" type="button" disabled={save.isPending} onClick={() => save.mutate({ s: current(), publish: true })}>
            <Icon name="check" />
            Publicar
          </Button>
        </div>
      </div>

      <div className="card prev">
        <div className="bar">
          <i />
          <i />
          <i />
          <span style={{ marginLeft: 8 }}>Pré-visualização</span>
          <span className="sp" />
          <a className={buttonVariants({ variant: "ghost", size: "sm" })} href="/" target="_blank" rel="noopener" aria-label="Abrir o site">
            <Icon name="ext" />
          </a>
        </div>
        <div className={`pv${DARK.includes(key) ? " dk" : ""}`} style={draft.visible ? undefined : { opacity: 0.4 }}>
          {key === "hero" ? (
            <>
              <div className="hero-th" style={{ backgroundImage: `linear-gradient(90deg,rgba(18,4,0,.85),rgba(18,4,0,.2)),url("${s.image}")` }} />
              <div className="lb">{s.label}</div>
              <h2>
                {s.title}
                <br />
                <em>{s.title2}</em>
              </h2>
              <p>{s.text}</p>
              <span className="pb">{s.cta}</span>
              <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>No site, esta foto alterna com as capas de dois projetos.</p>
            </>
          ) : (
            <>
              {s.image && <div className="hero-th" style={{ height: 180, backgroundPosition: "center 20%", backgroundImage: `url("${s.image}")` }} />}
              <div className="lb">{s.label}</div>
              {s.title && (
                <h2>
                  {plain(s.title)} {s.title2 && <em>{s.title2}</em>}
                </h2>
              )}
              {s.text && plain(s.text).split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              {s.items.length > 0 && (
                <div className="its">
                  {s.items.map((it, i) => (
                    <div key={i}>
                      <b>{it.title.replace("|", " ")}</b>
                      {it.text}
                    </div>
                  ))}
                </div>
              )}
              {s.cta && <span className="pb">{s.cta}</span>}
            </>
          )}
        </div>
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={(m) => setField("image", m.url)} />
    </>
  );
}

const plain = (t: string) => t.replace(/\[foto:[^\]]*\]\s?/g, "").replace(/\*([^*]+)\*/g, "$1");
