/** Window math adapted from Kokonut UI Focal Point Picker (Dorian Baffier, MIT). */
export type FocalPoint = { x: number; y: number };
export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
export function cropWindow(
  point: FocalPoint,
  imageRatio: number,
  ratio = 1,
  zoom = 1,
) {
  if (
    !Number.isFinite(imageRatio) ||
    imageRatio <= 0 ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  )
    throw new Error("Dimensões da imagem inválidas.");
  const magnification = clamp(Number.isFinite(zoom) ? zoom : 1, 1, 4);
  const w = Math.min(1, ratio / imageRatio) / magnification;
  const h = Math.min(1, imageRatio / ratio) / magnification;
  const left = clamp(
    (Number.isFinite(point.x) ? point.x : 0.5) - w / 2,
    0,
    1 - w,
  );
  const top = clamp(
    (Number.isFinite(point.y) ? point.y : 0.5) - h / 2,
    0,
    1 - h,
  );
  return { left, top, w, h };
}
export function imageCropStyle(window: ReturnType<typeof cropWindow>) {
  return {
    width: `${100 / window.w}%`,
    height: `${100 / window.h}%`,
    left: `${(-window.left / window.w) * 100}%`,
    top: `${(-window.top / window.h) * 100}%`,
    maxWidth: "none",
  };
}
export function squareCropPixels(
  width: number,
  height: number,
  point: FocalPoint,
  zoom: number,
) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Dimensões da imagem inválidas.");
  const crop = cropWindow(point, width / height, 1, zoom);
  return { x: crop.left * width, y: crop.top * height, side: crop.w * width };
}
