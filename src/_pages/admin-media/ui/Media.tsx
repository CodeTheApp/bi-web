"use client";
import { getMedia, getMediaCategories } from "@/shared/api/admin-reads";
import { Button } from "@/shared/ui/button";
import { AsciiImage } from "@/shared/ui/ascii/AsciiImage";
import { Input } from "@/shared/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import UndoButton from "@/shared/ui/kokonutui/undo-button";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import { Modal } from "@/shared/ui/admin/ui";
import "@/styles/admin-actions.css";
import { useMediaLibraryUrlState } from "@/features/media-library/client";
import { filterMedia, mediaCategories, mediaName } from "@/entities/media";
import { deleteMedia, setMediaArchived, saveMediaMetadata } from "@/server/admin/actions";
import type { MediaItem, MediaMetadata } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import { UploadButton } from "@/features/media-library/client";
import { MediaCategoryManager } from "@/features/media-library/client";
import { MediaLightbox } from "@/shared/ui/admin/MediaLightbox";
import { Choice, ControlTooltip, ErrorBox, PageHead, Skeleton, unwrap, useToast } from "@/shared/ui/admin/ui";

import "./media-responsive.css";

const metadata = (item: MediaItem): MediaMetadata => ({ name: mediaName(item), category: item.category ?? "", alt: item.alt });

export function Media() {
  const q = useQuery({ queryKey: ["media"], queryFn: ({ signal }) => unwrap(getMedia({ signal })) });
  const categoryQuery = useQuery({ queryKey: ["media-categories"], queryFn: ({ signal }) => unwrap(getMediaCategories({ signal })) });
  const { query, setQuery, category, setCategory, previewId, setPreviewId } = useMediaLibraryUrlState();
  const [archiveView, setArchiveView] = useQueryState("acervo", parseAsStringLiteral(["ativos", "arquivados", "todos"] as const).withDefault("ativos").withOptions({ shallow: true, scroll: false }));
  const missing = q.data?.filter((item) => !item.alt.trim()).length ?? 0;
  const categories = mediaCategories(q.data ?? [], categoryQuery.data ?? []);
  const filtered = filterMedia(q.data ?? [], query, category === "__all" ? "" : category).filter((item) => archiveView === "todos" || (archiveView === "arquivados" ? item.archived : !item.archived));
  const preview = previewId ? filtered.findIndex((item) => item.id === previewId) : null;
  const visibleIds = new Set(filtered.map((item) => item.id));
  return (
    <>
      <PageHead
        title="Mídia"
        sub={q.data ? `${q.data.length} arquivos · ${missing ? `${missing} sem texto alternativo` : "todas com texto alternativo"}. Organize por nome e categoria.` : "Organize as imagens usadas no site."}
      >
        <MediaCategoryManager categories={categories} media={q.data ?? []} />
        <UploadButton allowVideo label="Enviar arquivos" />
      </PageHead>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {categoryQuery.error && <ErrorBox error={categoryQuery.error} retry={() => categoryQuery.refetch()} />}
      <div className="card media-library-toolbar admin-media-toolbar">
        <label className="f media-library-search">
          Buscar na biblioteca
          <Input type="search" placeholder="Nome, descrição, categoria ou onde é usada" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="f media-library-category">
          <span id="media-category-label">Categoria</span>
          <Choice value={category} options={[["__all", "Todas as categorias"], ["__uncategorized", "Sem categoria"], ...categories.map((value): [string, string] => [value, value])]} onChange={setCategory} label="Filtrar por categoria" />
        </div>
        <div className="f media-library-archive"><span>Acervo</span><Choice label="Filtrar arquivos ativos ou arquivados" value={archiveView} options={[["ativos", "Ativos"], ["arquivados", "Arquivados"], ["todos", "Todo o acervo"]]} onChange={(value) => { void setArchiveView(value as typeof archiveView); setPreviewId(null); }} /></div>
        <small className="muted" aria-live="polite">{filtered.length} de {q.data?.length ?? 0} arquivos</small>
      </div>
      <div className="mg media-library-grid admin-media-grid">
        {!q.data && !q.error && [0, 1, 2, 3, 4, 5, 6, 7].map((index) => <Skeleton key={index} h={350} />)}
        {q.data?.map((item) => <Card key={item.id} item={item} categories={categories} hidden={!visibleIds.has(item.id)} onPreview={() => setPreviewId(item.id)} />)}
      </div>
      {q.data && filtered.length === 0 && <div className="card empty">{query || category !== "__all" ? "Nenhuma imagem encontrada. Tente outro nome ou categoria." : archiveView === "arquivados" ? "Nenhum arquivo arquivado." : "Nenhum arquivo na biblioteca. Envie o primeiro."}</div>}
      <MediaLightbox items={filtered.map((item) => ({ ...item, name: mediaName(item) }))} index={preview !== null && preview >= 0 ? preview : null} onIndexChange={(index) => setPreviewId(index === null ? null : filtered[index]?.id ?? null)} />
    </>
  );
}

function Card({ item, categories, hidden, onPreview }: { item: MediaItem; categories: string[]; hidden: boolean; onPreview: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(() => metadata(item));
  const [source, setSource] = useState(item);
  if (source !== item) {
    setSource(item);
    if (JSON.stringify(draft) === JSON.stringify(metadata(source))) setDraft(metadata(item));
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(metadata(item));
  const save = useMutation({
    mutationFn: (value: MediaMetadata) => unwrap(saveMediaMetadata(item.id, value)),
    onSuccess: (saved, submitted) => {
      setDraft((current) => JSON.stringify(current) === JSON.stringify(submitted) ? saved : current);
      toast("Informações da imagem salvas");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.setQueryData<MediaItem[]>(["media"], (old) => old?.map((media) => media.id === item.id ? { ...media, ...saved } : media));
    },
    onError: (error) => toast.error(error.message),
  });
  const del = useMutation({
    mutationFn: () => unwrap(deleteMedia(item.id)),
    onSuccess: () => {
      setConfirmDelete(false);
      toast.success("Arquivo excluído");
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const archive = useMutation({
    mutationFn: (archived: boolean) => unwrap(setMediaArchived(item.id, archived)),
    onSuccess: (_data, archived) => {
      qc.setQueryData<MediaItem[]>(["media"], (old) => old?.map((entry) => entry.id === item.id ? { ...entry, archived } : entry));
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(archived ? "Arquivo arquivado" : "Arquivo restaurado");
    },
  });
  const used = item.uses.length > 0;
  const removeLabel = used ? `Em uso em ${item.uses.join(", ")}. Troque a imagem nesses locais antes de excluir.` : `Excluir ${mediaName(item)}`;
  const set = (key: keyof MediaMetadata, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <article className={`card mi${!draft.alt.trim() ? " warn" : ""}`} aria-label={mediaName(item)} hidden={hidden}>
      <button type="button" className="im media-preview-trigger" aria-label={`Ampliar ${mediaName(item)}`} onClick={onPreview}>
        {item.kind === "video" ? <video src={item.url} muted playsInline preload="metadata" aria-label={item.alt || mediaName(item)} /> : <AsciiImage src={item.url} alt={item.alt || mediaName(item)} loading="lazy" />}
        <span className="media-preview-label"><Icon name="eye" />Ampliar</span>
        <div className="u">
          {item.uses.slice(0, 2).map((use) => <span key={use}>{use}</span>)}
          {item.uses.length > 2 && <span title={item.uses.slice(2).join(", ")}>+{item.uses.length - 2}</span>}
        </div>
      </button>
      <form className="bd" onSubmit={(event) => { event.preventDefault(); save.mutate(draft); }}>
        <div className="media-card-title">{draft.name}</div>
        <div className="f">
          <span>Categoria</span>
          <Choice value={draft.category || "__none"} options={[["__none", "Sem categoria"], ...categories.map((category): [string, string] => [category, category])]} onChange={(value) => set("category", value === "__none" ? "" : value)} label={`Categoria de ${mediaName(item)}`} />
        </div>
        <details className="media-card-details">
          <summary><Icon name="pen" />Editar informações</summary>
          <div className="stack">
            <label className="f">
              Nome do arquivo
              <Input required maxLength={120} value={draft.name} onChange={(event) => set("name", event.target.value)} />
            </label>
            <label className="f">
              Descrição acessível
              <Input maxLength={200} placeholder="Descreva o que aparece na imagem" value={draft.alt} onChange={(event) => set("alt", event.target.value)} />
              <small>Descrição para pessoas que usam leitores de tela.</small>
            </label>
          </div>
        </details>
        <div className="media-archive-control"><UndoButton className="admin-undo-action" label={item.archived ? "Restaurar arquivo" : "Arquivar arquivo"} doneLabel={item.archived ? "Restaurado" : "Arquivado"} disabled={archive.isPending || dirty} onCommit={() => archive.mutateAsync(!item.archived)} onError={(error) => toast.error(error instanceof Error ? error.message : "Não foi possível alterar o arquivo.")} />{dirty && <small>Salve as informações primeiro.</small>}</div>
        <div className="row">
          <small className="muted">{used ? "Em uso no site" : "Sem uso no site"}</small>
          <span className="sp" />
          <ControlTooltip label={removeLabel}>
            <span tabIndex={used ? 0 : undefined} style={{ display: "inline-flex" }} aria-label={used ? removeLabel : undefined}>
              <Button type="button" variant="ghost" size="sm" aria-label={`Excluir ${mediaName(item)}`} disabled={used || del.isPending} onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" />
              </Button>
            </span>
          </ControlTooltip>
          <Button type="submit" variant="outline" size="sm" disabled={!dirty || save.isPending || del.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </div>
        {save.error && <small className="hint" role="alert">Não foi possível salvar: {save.error.message}</small>}
      </form>
      <Modal open={confirmDelete} onClose={() => { if (!del.isPending) setConfirmDelete(false); }} title={`Excluir ${mediaName(item)}?`} description="Esta ação remove o arquivo da biblioteca e do armazenamento. Para manter uma cópia, arquive o arquivo.">
        <div className="row admin-media-confirm-actions"><span className="sp" /><Button variant="outline" type="button" disabled={del.isPending} onClick={() => setConfirmDelete(false)}>Cancelar</Button><HoldButton className="admin-hold-action" disabled={del.isPending || used} onHoldComplete={() => del.mutate()} holdingLabel="Continue pressionando" completeLabel="Solicitado">Segure para excluir</HoldButton></div>
        {del.error && <p role="alert" className="hint">{del.error.message}</p>}
      </Modal>
    </article>
  );
}
