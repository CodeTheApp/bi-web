"use client";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
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

type BtnProps = { variant?: "default" | "outline" | "dark" | "ghost"; size?: "default" | "sm" };

/** Botão de envio (seletor de arquivos da ReUI: tipo e tamanho validados antes de subir). */
export function UploadButton({ onDone, label = "Enviar fotos", variant = "default", size = "default" }: { onDone?: (m: MediaItem[]) => void; label?: string } & BtnProps) {
  const { upload, progress } = useUpload();
  const toast = useToast();
  const [, fu] = useFileUpload({
    accept: "image/*",
    multiple: true,
    maxFiles: 12,
    maxSize: 25 * 1024 * 1024,
    onFilesAdded: async (added) => {
      const done = await upload(added.map((f) => f.file).filter((f): f is File => f instanceof File));
      fu.clearFiles();
      onDone?.(done);
    },
    onError: (errs) => errs[0] && toast(errs[0]),
  });
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={fu.openFileDialog} disabled={progress !== null}>
        <Icon name="upload" />
        {progress !== null ? `Enviando… ${Math.round(progress * 100)}%` : label}
      </Button>
      <input {...fu.getInputProps()} className="sr-only" aria-label={label} />
    </>
  );
}

/** Área para soltar fotos (ou clicar), com o arrastar-e-soltar da ReUI. */
export function DropZone({ onDone }: { onDone: (m: MediaItem[]) => void }) {
  const { upload, progress } = useUpload();
  const toast = useToast();
  const [{ isDragging }, fu] = useFileUpload({
    accept: "image/*",
    multiple: true,
    maxFiles: 12,
    maxSize: 25 * 1024 * 1024,
    onFilesAdded: async (added) => {
      const done = await upload(added.map((f) => f.file).filter((f): f is File => f instanceof File));
      fu.clearFiles();
      onDone(done);
    },
    onError: (errs) => errs[0] && toast(errs[0]),
  });
  return (
    <div
      className={`drop${isDragging ? " on" : ""}`}
      role="button"
      tabIndex={0}
      onClick={fu.openFileDialog}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fu.openFileDialog()}
      onDragEnter={fu.handleDragEnter}
      onDragLeave={fu.handleDragLeave}
      onDragOver={fu.handleDragOver}
      onDrop={fu.handleDrop}
    >
      <div>
        <Icon name="upload" />
        <span style={{ display: "block", marginTop: 6 }}>
          {progress !== null ? (
            `Enviando… ${Math.round(progress * 100)}%`
          ) : (
            <>
              Arraste fotos aqui
              <br />
              ou clique para enviar
            </>
          )}
        </span>
      </div>
      <input {...fu.getInputProps()} className="sr-only" aria-label="Enviar fotos" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/** Seletor da biblioteca de mídia. */
export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: MediaItem) => void }) {
  const q = useQuery({ queryKey: ["media"], queryFn: () => unwrap(getMedia()), enabled: open });
  return (
    <Modal open={open} onClose={onClose} wide title="Escolher da biblioteca" description="Clique numa foto para usar, ou envie uma nova.">
      <div className="row" style={{ marginBottom: 4 }}>
        <UploadButton variant="outline" size="sm" label="Enviar nova" onDone={(m) => m[0] && (onPick(m[0]), onClose())} />
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
