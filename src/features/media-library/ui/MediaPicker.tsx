"use client";
import { getMedia, getMediaCategories } from "@/shared/api/admin-reads";
import { Button } from "@/shared/ui/button";
import { AsciiImage } from "@/shared/ui/ascii/AsciiImage";
import { Input } from "@/shared/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { IMAGE_UPLOAD_TYPES, VIDEO_UPLOAD_TYPES, IMAGE_UPLOAD_LIMIT, VIDEO_UPLOAD_LIMIT } from "@/shared/lib/upload-policy";
import FileUpload from "@/shared/ui/kokonutui/file-upload";
import { uploadLibraryFile } from "../lib/upload";
import "./media-upload.css";

import type { MediaItem } from "@/entities/admin";
import { filterMedia, mediaCategories, mediaName } from "@/entities/media";
import { Icon } from "@/shared/ui/admin/icons";
import { MediaLightbox } from "@/shared/ui/admin/MediaLightbox";
import { Choice, ErrorBox, Modal, Skeleton, unwrap, useToast } from "@/shared/ui/admin/ui";

const ALL_UPLOAD_TYPES = [...IMAGE_UPLOAD_TYPES, ...VIDEO_UPLOAD_TYPES];
const PHOTO_UPLOAD_TYPES = [...IMAGE_UPLOAD_TYPES];

type BtnProps = { variant?: "default" | "outline" | "dark" | "ghost"; size?: "default" | "sm" };

/** A real upload queue: processing, transfer, registration and errors use one lifecycle. */
function LibraryUploadQueue({ onDone, allowVideo = false }: { onDone?: (items: MediaItem[]) => void; allowVideo?: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const uploaded = useRef(new Map<File, MediaItem>());
  const delivered = useRef(new Set<File>());
  return <div className="library-upload-content"><FileUpload className="library-file-upload" acceptedFileTypes={allowVideo ? ALL_UPLOAD_TYPES : PHOTO_UPLOAD_TYPES} maxFiles={12} maxFileSize={allowVideo ? VIDEO_UPLOAD_LIMIT : IMAGE_UPLOAD_LIMIT}
    validateFile={(file) => file.type.startsWith("image/") && file.size > IMAGE_UPLOAD_LIMIT ? { code: "file-too-large", message: "Envie imagens de até 15 MB." } : null}
    onUpload={async (file, helpers) => { const item = await uploadLibraryFile(file, helpers); uploaded.current.set(file, item); void qc.invalidateQueries({ queryKey: ["media"] }); void qc.invalidateQueries({ queryKey: ["dashboard"] }); }}
    onComplete={(files) => { const fresh = files.filter((file) => !delivered.current.has(file) && uploaded.current.has(file)); fresh.forEach((file) => delivered.current.add(file)); const items = fresh.map((file) => uploaded.current.get(file)!); if (items.length) { onDone?.(items); toast.success(items.length === 1 ? "Arquivo enviado para a biblioteca" : `${items.length} arquivos enviados`); } }} />
    <p className="library-upload-help">{allowVideo ? "Imagens de até 15 MB são otimizadas antes do envio. Vídeos: MP4, WebM ou MOV, até 100 MB com S3; neste ambiente, até 2,5 MB." : "As imagens são otimizadas antes do envio. Você pode selecionar até 12 arquivos."}</p>
    <p className="library-upload-help">Fechar este painel cancela os envios que ainda estiverem em andamento.</p>
  </div>;
}

export function UploadButton({ onDone, label = "Enviar fotos", variant = "default", size = "default", allowVideo = false }: { onDone?: (m: MediaItem[]) => void; label?: string; allowVideo?: boolean } & BtnProps) {
  const [open, setOpen] = useState(false);
  return <><Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}><Icon name="upload" />{label}</Button><Modal open={open} onClose={() => setOpen(false)} title={allowVideo ? "Enviar imagens e vídeos" : "Enviar imagens"} description="Arraste seus arquivos ou selecione no computador. Acompanhe cada envio abaixo.">{open && <LibraryUploadQueue allowVideo={allowVideo} onDone={onDone} />}</Modal></>;
}

export function DropZone({ onDone, allowVideo = false }: { onDone: (items: MediaItem[]) => void; allowVideo?: boolean }) {
  return <LibraryUploadQueue onDone={onDone} allowVideo={allowVideo} />;
}

/** Seletor da biblioteca de mídia. */
export function MediaPicker({ open, onClose, onPick, allowVideo = false }: { open: boolean; onClose: () => void; onPick: (m: MediaItem) => void; allowVideo?: boolean }) {
  const q = useQuery({ queryKey: ["media"], queryFn: ({ signal }) => unwrap(getMedia({ signal })), enabled: open });
  const categoryQuery = useQuery({ queryKey: ["media-categories"], queryFn: ({ signal }) => unwrap(getMediaCategories({ signal })), enabled: open });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("__all");
  const [preview, setPreview] = useState<number | null>(null);
  const categories = mediaCategories(q.data ?? [], categoryQuery.data ?? []);
  const filtered = filterMedia((q.data ?? []).filter((item) => !item.archived && (allowVideo || item.kind !== "video")), query, category === "__all" ? "" : category);
  return (
    <><Modal open={open} onClose={onClose} wide title="Escolher da biblioteca" description={allowVideo ? "Selecione uma imagem ou vídeo. Use Ampliar para conferir o arquivo completo." : "Selecione uma foto para usar. Use Ampliar para conferir a imagem inteira."}>
      <div className="media-library-toolbar">
        <label className="f media-library-search">
          {allowVideo ? "Buscar arquivo" : "Buscar imagem"}
          <Input type="search" placeholder="Nome, descrição ou uso" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="f media-library-category">
          Categoria
          <Choice value={category} options={[["__all", "Todas as categorias"], ["__uncategorized", "Sem categoria"], ...categories.map((value): [string, string] => [value, value])]} onChange={setCategory} label={allowVideo ? "Filtrar arquivos por categoria" : "Filtrar imagens por categoria"} />
        </div>
        <UploadButton variant="outline" size="sm" label="Enviar novo arquivo" allowVideo={allowVideo} onDone={(m) => m[0] && (onPick(m[0]), onClose())} />
      </div>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="mg media-picker-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))" }}>
        {!q.data && !q.error && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={130} />)}
        {filtered.map((m, index) => (
          <div key={m.id} className="card mi media-picker-card">
          <button
            className="media-picker-select"
            style={{ padding: 0, cursor: "pointer", textAlign: "left" }}
            title={m.alt || mediaName(m)}
            aria-label={`Usar ${mediaName(m)}${m.category ? `, ${m.category}` : ""}`}
            onClick={() => {
              onPick(m);
              onClose();
            }}
          >
            {m.kind === "video" ? <video className="im" src={m.url} muted playsInline preload="metadata" /> : <AsciiImage className="im" src={m.url} alt={m.alt || mediaName(m)} loading="lazy" />}
            <div className="bd"><span>{mediaName(m)}</span><small>{m.category || "Sem categoria"}</small></div>
          </button>
          <button type="button" className="media-picker-enlarge media-preview-label" aria-label={`Ampliar ${mediaName(m)}`} onClick={() => setPreview(index)}><Icon name="eye" />Ampliar</button>
          </div>
        ))}
      </div>
      {q.data && filtered.length === 0 && <p className="muted">{allowVideo ? "Nenhum arquivo encontrado." : "Nenhuma imagem encontrada."}</p>}
    </Modal><MediaLightbox items={filtered.map((item) => ({ ...item, name: mediaName(item) }))} index={open ? preview : null} onIndexChange={setPreview} /></>
  );
}
