"use client";
import { squareCropPixels, type FocalPoint } from "@/shared/lib/image-crop";

export function loadAvatarImage(src: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Cancelado", "AbortError"));
    };
    image.crossOrigin = "anonymous";
    image.onload = () => {
      cleanup();
      if (image.naturalWidth && image.naturalHeight) resolve(image);
      else reject(new Error("Esta imagem não tem dimensões válidas."));
    };
    image.onerror = () => {
      cleanup();
      reject(
        new Error(
          "Não foi possível abrir esta foto para recortar. Envie o arquivo do computador ou escolha outra imagem.",
        ),
      );
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    image.src = src;
  });
}
export async function cropAvatarFile(
  image: HTMLImageElement,
  point: FocalPoint,
  zoom: number,
  name: string,
) {
  const crop = squareCropPixels(
    image.naturalWidth,
    image.naturalHeight,
    point,
    zoom,
  );
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("O navegador não conseguiu preparar a foto.");
  try {
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.side,
      crop.side,
      0,
      0,
      512,
      512,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Não foi possível gerar o recorte.")),
        "image/webp",
        0.9,
      ),
    );
    return new File(
      [blob],
      `Avatar ${name.replace(/[\\/:*?"<>|]/g, "").slice(0, 70) || "perfil"}.webp`,
      { type: blob.type },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError")
      throw new Error(
        "O servidor desta foto não permite recortá-la. Envie o arquivo do computador para continuar.",
      );
    throw error;
  }
}
