"use client";
import { getSections } from "@/shared/api/admin-reads";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryState } from "nuqs";
import { sectionSelectionParser } from "@/features/page-editor";
import { normalizeSectionOrder, SECTION_NAMES, type Item, type Section, type SectionKey } from "@/entities/site-content";
import { lumiImageOf } from "@/entities/site-content";
import { reorderSections, saveSection, setSectionVisible } from "@/server/admin/actions";
import type { SectionRow } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import { MediaPicker } from "@/features/media-library/client";
import { Grip, SortableItem, SortableList } from "@/shared/ui/admin/Sortable";
import { Chip, ControlTooltip, ErrorBox, Modal, PageHead, Skeleton, Switch, unwrap, useToast } from "@/shared/ui/admin/ui";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import SaveStatus from "@/shared/ui/kokonutui/save-status";
import { SectionPreviewPanel } from "@/features/page-preview";
import { SectionEditorStore, type SectionEditorState } from "@/features/page-editor";

import "./pages-responsive.css";
import { onAdminWorkspaceChange } from "@/shared/lib/admin-workspace-lifecycle";

type Field = "label" | "title" | "title2" | "text" | "cta" | "image";
const FIELDS: Record<SectionKey, Field[]> = {
  hero: ["label", "title", "title2", "text", "cta", "image"],
  quem: ["label", "title", "text"],
  faixa: [],
  formas: ["label", "title", "text"],
  camila: ["label", "title", "text", "image"],
  lumi: ["label", "title", "text", "cta"],
  cobogos: ["label", "title", "text"],
  portfolio: ["label", "title", "text"],
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
const FIELD_LIMIT: Record<Field, number | undefined> = { label: 80, title: 200, title2: 120, text: 1200, cta: 40, image: undefined };
const BASE: Record<Field, string> = { label: "Rótulo (acima do título)", title: "Título", title2: "Título — destaque", text: "Texto", cta: "Texto do botão", image: "Imagem" };
const HINT: Partial<Record<SectionKey, string>> = {
  quem: "Use *palavras* para destacar em âmbar e [foto:/img/arquivo.jpg|Legenda] para uma micro-foto no meio do texto.",
  camila: "Separe parágrafos com uma linha em branco. *palavras* ficam em negrito.",
  faixa: "Os termos se repetem na faixa em movimento. Edite os textos ou arraste os itens para mudar a sequência.",
  cobogos: "Use *palavras* no título para destacar em âmbar. O desenho e a animação do mosaico são preservados.",
  portfolio: "Edite a abertura do portfólio aqui. As imagens e os detalhes de cada projeto ficam na aba Projetos.",
};
const ITEMS: Partial<Record<SectionKey, { label: string; title: string; text?: string; image?: boolean; hint?: string }>> = {
  quem: { label: "Números", title: "Número|unidade (ex.: 17|anos)", text: "Título — descrição", hint: "O número anima ao aparecer. Separe o título da descrição com “ — ”." },
  faixa: { label: "Termos da faixa", title: "Termo" },
  formas: { label: "Formas de trabalhar", title: "Título", text: "Descrição" },
  camila: { label: "Credenciais", title: "Credencial" },
  lumi: { label: "Etapas", title: "Etapa", text: "Descrição", image: true },
  oferta: { label: "Serviços", title: "Título", text: "Descrição" },
};

type LocalItem = Item & { _id: string };
type MediaTarget = { kind: "section" } | { kind: "item"; id: string };
let seq = 0;
const withIds = (s: Section) => s.items.map((it) => ({ ...it, _id: `i${++seq}` }));

export function Pages() {
  const q = useQuery({ queryKey: ["sections"], queryFn: ({ signal }) => unwrap(getSections({ signal })) });

  return (
    <>
      <PageHead title="Páginas" sub="Edite todas as seções da home. Publique os textos; ordem e visibilidade atualizam o site na hora." />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? !q.error && (
        <div className="pg">
          <Skeleton h={420} />
          <Skeleton h={420} />
          <Skeleton h={420} />
        </div>
      ) : (
        <Workspace rows={q.data.sections} />
      )}
    </>
  );
}

function Workspace({ rows }: { rows: SectionRow[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [cur, setCur] = useQueryState("secao", sectionSelectionParser.withOptions({ history: "push", shallow: true, scroll: false }));
  const [store] = useState(() => new SectionEditorStore(rows, {
    save: (key, section, publish) => unwrap(saveSection(key, section, publish)),
    setVisible: (key, visible) => unwrap(setSectionVisible(key, visible)),
    saved: (key, section, publish) => {
      qc.setQueryData<{ sections: SectionRow[] }>(["sections"], (data) => data && ({
        sections: data.sections.map((row) => row.key === key ? { ...row, draft: section, status: publish ? "publicado" : "rascunho", ...(publish ? { published: section } : {}) } : row),
      }));
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (publish) toast("Publicado. O site atualiza em segundos.");
    },
    visibilitySaved: (key, visible) => {
      qc.setQueryData<{ sections: SectionRow[] }>(["sections"], (data) => data && ({
        sections: data.sections.map((row) => row.key === key ? { ...row, draft: { ...row.draft, visible }, published: { ...row.published, visible } } : row),
      }));
      toast(visible ? "Seção exibida no site" : "Seção ocultada do site");
    },
    error: (error) => toast(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."),
  }));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => store.reconcile(rows), [store, rows]);
  useEffect(() => store.flush, [store]);
  useEffect(() => onAdminWorkspaceChange(store.stopForWorkspaceChange), [store]);

  const order = normalizeSectionOrder(rows.map((row) => row.key));
  const reorder = useMutation({
    mutationFn: (keys: SectionKey[]) => unwrap(reorderSections(keys)),
    onMutate: async (keys) => {
      await qc.cancelQueries({ queryKey: ["sections"] });
      const previous = qc.getQueryData<{ sections: SectionRow[] }>(["sections"]);
      qc.setQueryData<{ sections: SectionRow[] }>(["sections"], (data) => data && ({
        sections: keys.flatMap((key) => data.sections.filter((row) => row.key === key)),
      }));
      return { previous };
    },
    onSuccess: () => {
      toast("Ordem atualizada no site");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error, _keys, context) => {
      if (context?.previous) {
        const previousKeys = context.previous.sections.map((row) => row.key);
        qc.setQueryData<{ sections: SectionRow[] }>(["sections"], (data) => data && ({
          sections: previousKeys.flatMap((key) => data.sections.filter((row) => row.key === key)),
        }));
      }
      toast(error.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["sections"] }),
  });
  const moveCurrent = (direction: -1 | 1) => {
    const index = order.indexOf(cur);
    const target = index + direction;
    if (target < 0 || target >= order.length || reorder.isPending) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  return (
    <div className={`pg section-workspace admin-pages-workspace${previewExpanded ? " preview-expanded" : " preview-collapsed"}`}>
      <div className="card sections-list">
        <div className="sections-list-head">
          <b>Seções</b>
          <div className="section-order-actions">
            <ControlTooltip label={`Mover ${SECTION_NAMES[cur]} para cima`}>
              <Button variant="ghost" size="sm" aria-label={`Mover ${SECTION_NAMES[cur]} para cima`} disabled={order.indexOf(cur) === 0 || reorder.isPending} onClick={() => moveCurrent(-1)}>
                <Icon name="back" style={{ transform: "rotate(90deg)" }} />
              </Button>
            </ControlTooltip>
            <ControlTooltip label={`Mover ${SECTION_NAMES[cur]} para baixo`}>
              <Button variant="ghost" size="sm" aria-label={`Mover ${SECTION_NAMES[cur]} para baixo`} disabled={order.indexOf(cur) === order.length - 1 || reorder.isPending} onClick={() => moveCurrent(1)}>
                <Icon name="back" style={{ transform: "rotate(-90deg)" }} />
              </Button>
            </ControlTooltip>
          </div>
        </div>
        <p className="section-order-hint">Arraste para mudar a ordem.</p>
        <SortableList items={order} getId={(key) => key} onMove={(next) => { if (!reorder.isPending) reorder.mutate(next); }} className="section-nav-list">
          {order.map((k) => {
            const r = state[k];
            if (!r) return null;
            const visible = r.draft.visible;
            return (
              <SortableItem key={k} value={k} className={`section-nav-item${k === cur ? " on" : ""}`}>
                <span className="section-grip"><Grip /></span>
                <button className="section-select" type="button" aria-pressed={k === cur} onClick={() => setCur(k)}>
                  <span>{SECTION_NAMES[k]}</span>
                  <small>{!visible ? "Oculta" : r.status === "rascunho" ? "Rascunho" : "Publicada"}</small>
                </button>
                <Switch checked={visible} title={`${visible ? "Ocultar" : "Exibir"} ${SECTION_NAMES[k]} no site`} onChange={(value) => store.setVisible(k, value)} />
              </SortableItem>
            );
          })}
        </SortableList>
        <p className="section-order-hint" role="status">{reorder.isPending ? "Salvando ordem…" : "Ordem aplicada ao site."}</p>
      </div>
      {state[cur] && <Editor key={cur} store={store} state={state[cur]} />}
      {state[cur] && <SectionPreviewPanel section={cur} draft={state[cur]!.draft} revision={state[cur]!.revision} pending={state[cur]!.dirty || state[cur]!.saving} expanded={previewExpanded} onToggle={() => setPreviewExpanded(!previewExpanded)} />}
    </div>
  );
}

function Editor({ store, state }: { store: SectionEditorStore; state: SectionEditorState }) {
  const { key, draft, status, message: saved, saving } = state;
  const [itemIds, setItemIds] = useState(() => withIds(draft).map((item) => item._id));
  const items: LocalItem[] = draft.items.map((item, index) => {
    const image = key === "lumi" ? lumiImageOf(item, index) : null;
    return { ...item, ...(image ? { image: image.src, imageAlt: image.alt } : {}), _id: itemIds[index] ?? `${key}-item-${index}` };
  });
  const [multilineTitle] = useState(() => key === "quem" || draft.title.length > 40);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget | null>(null);
  const cfg = ITEMS[key];
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removingItem = items.find((item) => item._id === removingId);

  const setField = (f: Field, v: string) => {
    store.edit(key, (section) => ({ ...section, [f]: v }));
  };
  const setItemsAndSave = (next: LocalItem[]) => {
    setItemIds(next.map((item) => item._id));
    store.edit(key, (section) => ({ ...section, items: next.map(({ _id, ...item }) => { void _id; return item; }) }));
  };

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
            title="Exibir ou ocultar esta seção no site imediatamente"
            onChange={(v) => store.setVisible(key, v)}
          />
        </div>
        <div className="bd">
          {HINT[key] && <p className="hint">{HINT[key]}</p>}
          {FIELDS[key].map((f) =>
            f === "image" ? (
              <div className="f admin-field" key={f}>
                {LABEL[key]?.[f] ?? BASE[f]}
                <div className="row admin-pages-image-row">
                  {draft.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.image} alt="" style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  <Button variant="outline" size="sm" type="button" onClick={() => setMediaTarget({ kind: "section" })}>
                    <Icon name="image" />
                    Trocar imagem
                  </Button>
                </div>
              </div>
            ) : (
              <label className="f" key={f}>
                {LABEL[key]?.[f] ?? BASE[f]}
                {f === "text" || (f === "title" && multilineTitle) ? (
                  <Textarea className="in" maxLength={FIELD_LIMIT[f]} value={draft[f]} onChange={(e) => setField(f, e.target.value)} rows={f === "text" ? 5 : 3} />
                ) : (
                  <Input className="in" maxLength={FIELD_LIMIT[f]} value={draft[f]} onChange={(e) => setField(f, e.target.value)} />
                )}
              </label>
            ),
          )}
          {cfg && (
            <>
              <div className="row admin-pages-items-header" style={{ marginTop: 6 }}>
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
                        <ControlTooltip label={`Remover item ${i + 1}`}><Button variant="ghost" size="sm" type="button" aria-label={`Remover item ${i + 1}`} onClick={() => setRemovingId(it._id)}>
                          <Icon name="trash" />
                        </Button></ControlTooltip>
                      </div>
                      <label className="f">{cfg.title}<Input className="in" maxLength={120} placeholder={cfg.title} value={it.title} onChange={(e) => setItemsAndSave(items.map((x) => (x._id === it._id ? { ...x, title: e.target.value } : x)))} /></label>
                      {cfg.text && (
                        <label className="f">{cfg.text}<Textarea className="in" maxLength={600} placeholder={cfg.text} style={{ minHeight: 60 }} value={it.text} onChange={(e) => setItemsAndSave(items.map((x) => (x._id === it._id ? { ...x, text: e.target.value } : x)))} /></label>
                      )}
                      {cfg.image && (
                        <div className="stack" style={{ gap: 8 }}>
                          <div className="row admin-pages-image-row">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={it.image} alt={it.imageAlt || ""} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8 }} />
                            <Button variant="outline" size="sm" type="button" onClick={() => setMediaTarget({ kind: "item", id: it._id })}>
                              <Icon name="image" />
                              Trocar foto da etapa
                            </Button>
                          </div>
                          <label className="f">
                            Descrição da imagem
                            <Input value={it.imageAlt || ""} maxLength={200} onChange={(event) => setItemsAndSave(items.map((item) => item._id === it._id ? { ...item, imageAlt: event.target.value } : item))} />
                          </label>
                        </div>
                      )}
                    </SortableItem>
                  ))}
              </SortableList>
            </>
          )}
        </div>
        <div className="ft admin-pages-footer">
          <SaveStatus status={saved.startsWith("Não foi possível") ? "error" : saving ? "saving" : state.dirty ? "editing" : "saved"} message={saved} />
          <span className="sp" />
          <Button variant="outline" type="button" disabled={saving} onClick={() => store.save(key, false)}>
            Salvar rascunho
          </Button>
          <Button variant="dark" type="button" disabled={saving} onClick={() => store.save(key, true)}>
            <Icon name="check" />
            Publicar
          </Button>
        </div>
      </div>

      <Modal open={removingId !== null} onClose={() => setRemovingId(null)} title="Remover este item?" description={removingItem ? `“${removingItem.title || "Item sem título"}” será removido de ${SECTION_NAMES[key]}. A alteração será salva no rascunho; o site só muda ao publicar.` : "Este item não está mais disponível."}>
        <div className="row admin-pages-confirm-actions"><span className="sp" /><Button variant="outline" type="button" onClick={() => setRemovingId(null)}>Cancelar</Button><HoldButton className="admin-hold-action" disabled={!removingItem} holdingLabel="Continue pressionando" completeLabel="Removido" onHoldComplete={() => { if (!removingItem) return; setItemsAndSave(items.filter((item) => item._id !== removingId)); setRemovingId(null); }}>Segure para remover</HoldButton></div>
      </Modal>
      <MediaPicker open={mediaTarget !== null} onClose={() => setMediaTarget(null)} onPick={(media) => {
        if (mediaTarget?.kind === "item") {
          setItemsAndSave(items.map((item) => item._id === mediaTarget.id ? { ...item, image: media.url, imageAlt: media.alt || item.title } : item));
        } else setField("image", media.url);
      }} />
    </>
  );
}
