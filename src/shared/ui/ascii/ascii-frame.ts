const DENSITY = " .:-=+*#%@";

/** One glyph per decoded pixel; transparent pixels stay empty. */
export function asciiRows(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): string[] {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 12000 ||
    rgba.length !== width * height * 4
  )
    return [];
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const i = (y * width + x) * 4;
      const alpha = rgba[i + 3] / 255;
      const light =
        (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
      return DENSITY[Math.round((1 - light) * alpha * (DENSITY.length - 1))];
    }).join(""),
  );
}
