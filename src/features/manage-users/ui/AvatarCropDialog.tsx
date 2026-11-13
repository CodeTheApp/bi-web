"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/entities/admin";
import { uploadLibraryFile } from "@/features/media-library/client";
import FocalPointPicker, {
  type AvatarCropValue,
} from "@/shared/ui/kokonutui/focal-point-picker";
import { Modal, Skeleton } from "@/shared/ui/admin/ui";
import { Button } from "@/shared/ui/button";
import { Check, Upload } from "@/shared/ui/icons/lucide";
import { cropAvatarFile, loadAvatarImage } from "../lib/avatar-crop";

export type AvatarCropSource = { src: string; name: string; local?: boolean };
export function AvatarCropDialog({
  source,
  name,
  onClose,
  onConfirm,
  onUpload,
}: {
  source: AvatarCropSource;
  name: string;
  onClose: () => void;
  onConfirm: (media: MediaItem) => void;
  onUpload: () => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [crop, setCrop] = useState<AvatarCropValue>({
    point: { x: 0.5, y: 0.5 },
    zoom: 1,
  });
  const upload = useRef<AbortController | null>(null);
  useEffect(() => {
    const load = new AbortController();
    void loadAvatarImage(source.src, load.signal)
      .then((loaded) => {
        if (!load.signal.aborted) setImage(loaded);
      })
      .catch((reason: Error) => {
        if (!load.signal.aborted) setError(reason.message);
      });
    return () => {
      load.abort();
      upload.current?.abort();
    };
  }, [source.src]);
  const applyPhoto = async () => {
    if (!image || busy) return;
    const controller = new AbortController();
    upload.current = controller;
    setBusy(true);
    setError("");
    try {
      const file = await cropAvatarFile(image, crop.point, crop.zoom, name);
      controller.signal.throwIfAborted();
      const media = await uploadLibraryFile(
        file,
        {
          signal: controller.signal,
          onProgress: (value) => {
            if (!controller.signal.aborted) setProgress(value);
          },
        },
        { maxDimension: 512, preserveImageFormat: true },
      );
      controller.signal.throwIfAborted();
      onConfirm(media);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível preparar a foto.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Ajustar foto do perfil"
      description="Arraste a foto para enquadrar e ajuste o zoom. Confira a prévia antes de continuar."
    >
      {!image && !error && <Skeleton h={300} />}
      {image && (
        <FocalPointPicker
          src={source.src}
          imageRatio={image.naturalWidth / image.naturalHeight}
          value={crop}
          onValueChange={setCrop}
          disabled={busy}
        />
      )}
      {error && (
        <div className="staff-crop-error" role="alert">
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onUpload}>
            <Upload size={15} />
            Enviar do computador
          </Button>
        </div>
      )}
      {busy && (
        <progress
          className="staff-crop-progress"
          value={progress}
          max={100}
          aria-label="Preparando foto"
        />
      )}
      <div className="staff-profile-footer">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!image || busy}
          onClick={() => void applyPhoto()}
        >
          <Check size={15} />
          {busy ? "Preparando foto…" : "Usar foto"}
        </Button>
      </div>
    </Modal>
  );
}
