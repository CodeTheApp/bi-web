"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { createUpload, getMedia, registerMedia } from "@/server/admin/actions";
import type { MediaItem } from "@/server/admin/types";
import { Icon } from "./icons";
import { Modal, Skeleton, unwrap, useToast } from "./ui";

/** Reduz a foto no navegador antes de enviar (lado maior até `max` px). */
async function shrink(file: File, max: number, type = "image/webp", quality = 0.86) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar a imagem."))), type, quality));
  return { blob, w, h, dataUrl: () => c.toDataURL("image/jpeg", 0.8) };
}

/** Envia fotos para a biblioteca: S3 com URL assinada (ou embutida no modo demonstração). */
export function useUpload() {
  const qc = useQueryClient();
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(files: FileList | File[]): Promise<MediaItem[]> {
    const list = Array.from(files).filter((f) => /^image\//.test(f.type)).slice(0, 12);
    if (!list.length) return [];
    const out: MediaItem[] = [];
    try {
      for (const [i, file] of list.entries()) {
        setProgress(i / list.length);
        const img = await shrink(file, 2400);
        const target = await unwrap(createUpload("image/webp", img.blob.size));
        let url: string, key: string | null = null;
        if (target.mode === "s3") {
          const r = await fetch(target.uploadUrl, { method: "PUT", body: img.blob, headers: { "Content-Type": "image/webp" } });
          if (!r.ok) throw new Error("O envio para o armazenamento falhou.");
          url = target.publicUrl;
          key = target.key;
        } else {
          url = (await shrink(file, 1600, "image/jpeg", 0.8)).dataUrl();
        }
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        out.push(await unwrap(registerMedia({ url, key, width: img.w, height: img.h, alt: "", name: alt })));
      }
      toast(list.length > 1 ? `${list.length} fotos enviadas` : "Foto enviada para a biblioteca");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
    return out;
  }
  return { upload, progress };
}

export function UploadButton({ onDone, label = "Enviar fotos", className = "btn pri" }: { onDone?: (m: MediaItem[]) => void; label?: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, progress } = useUpload();
  return (
    <>
      <button className={className} type="button" onClick={() => input.current?.click()} disabled={progress !== null}>
        <Icon name="upload" />
        {progress !== null ? `Enviando… ${Math.round(progress * 100)}%` : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = e.target.files;
          if (files) onDone?.(await upload(files));
          e.target.value = "";
        }}
      />
    </>
  );
}

/** Área para soltar fotos (ou clicar). */
export function DropZone({ onDone }: { onDone: (m: MediaItem[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, progress } = useUpload();
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop${over ? " on" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        onDone(await upload(e.dataTransfer.files));
      }}
    >
      <div>
        <Icon name="upload" />
        <span style={{ display: "block", marginTop: 6 }}>
          {progress !== null ? `Enviando… ${Math.round(progress * 100)}%` : (
            <>
              Arraste fotos aqui
              <br />
              ou clique para enviar
            </>
          )}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          if (e.target.files) onDone(await upload(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Seletor da biblioteca de mídia. */
export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: MediaItem) => void }) {
  const q = useQuery({ queryKey: ["media"], queryFn: () => unwrap(getMedia()), enabled: open });
  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 26 }}>
          Escolher da biblioteca
        </h2>
        <span className="sp" />
        <UploadButton className="btn sec sm" label="Enviar nova" onDone={(m) => m[0] && (onPick(m[0]), onClose())} />
        <button className="btn ghost" onClick={onClose} aria-label="Fechar">
          <Icon name="x" />
        </button>
      </div>
      <div className="mg" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))" }}>
        {!q.data && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={130} />)}
        {q.data?.map((m) => (
          <button
            key={m.id}
            className="card mi"
            style={{ padding: 0, cursor: "pointer", textAlign: "left" }}
            title={m.alt || "Sem descrição"}
            onClick={() => {
              onPick(m);
              onClose();
            }}
          >
            <div className="im" style={{ backgroundImage: `url("${m.url}")` }} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
