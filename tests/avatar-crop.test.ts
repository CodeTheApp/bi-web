import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cropWindow,
  imageCropStyle,
  squareCropPixels,
} from "@/shared/lib/image-crop";
import {
  cropAvatarFile,
  loadAvatarImage,
} from "@/features/manage-users/lib/avatar-crop";

afterEach(() => vi.unstubAllGlobals());
describe("avatar crop geometry", () => {
  it.each([
    [2000, 1000],
    [1000, 2000],
    [512, 512],
  ])(
    "keeps the square crop within a %s×%s source at every corner and zoom",
    (width, height) => {
      for (const x of [-1, 0, 0.5, 1, 2])
        for (const y of [-1, 0, 0.5, 1, 2])
          for (const zoom of [1, 2, 4]) {
            const crop = squareCropPixels(width, height, { x, y }, zoom);
            expect(crop.x).toBeGreaterThanOrEqual(0);
            expect(crop.y).toBeGreaterThanOrEqual(0);
            expect(crop.x + crop.side).toBeLessThanOrEqual(width + 0.00001);
            expect(crop.y + crop.side).toBeLessThanOrEqual(height + 0.00001);
            expect(crop.side).toBeCloseTo(Math.min(width, height) / zoom);
          }
    },
  );
  it("uses the same window for the square editor, circular preview and exported pixels", () => {
    const crop = cropWindow({ x: 0.8, y: 0.3 }, 2, 1, 2);
    const pixels = squareCropPixels(2000, 1000, { x: 0.8, y: 0.3 }, 2);
    expect(pixels).toEqual({
      x: crop.left * 2000,
      y: crop.top * 1000,
      side: crop.w * 2000,
    });
    expect(imageCropStyle(crop)).toMatchObject({
      width: "400%",
      height: "200%",
      maxWidth: "none",
    });
  });
  it("rejects invalid source sizes instead of producing a corrupt file", () => {
    expect(() => squareCropPixels(0, 200, { x: 0.5, y: 0.5 }, 2)).toThrow(
      "Dimensões",
    );
    expect(() =>
      squareCropPixels(Number.NaN, 200, { x: 0.5, y: 0.5 }, 2),
    ).toThrow("Dimensões");
  });
});

describe("avatar crop file generation", () => {
  it("exports a new 512px WebP using the selected source window without mutating the source image", async () => {
    const image = {
      naturalWidth: 2000,
      naturalHeight: 1000,
    } as HTMLImageElement;
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback) =>
        callback(new Blob(["cropped pixels"], { type: "image/webp" })),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    const file = await cropAvatarFile(image, { x: 0.9, y: 0.1 }, 2, "Maria");
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(
      image,
      1500,
      0,
      500,
      500,
      0,
      0,
      512,
      512,
    );
    expect(canvas).toMatchObject({ width: 512, height: 512 });
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("Avatar Maria.webp");
    expect(file.type).toBe("image/webp");
    expect(image).toEqual({ naturalWidth: 2000, naturalHeight: 1000 });
  });
  it("gives a local-upload fallback when remote CORS prevents canvas export", async () => {
    const canvas = {
      getContext: () => ({
        drawImage: () => {
          throw new DOMException("Tainted", "SecurityError");
        },
      }),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    await expect(
      cropAvatarFile(
        { naturalWidth: 1000, naturalHeight: 1000 } as HTMLImageElement,
        { x: 0.5, y: 0.5 },
        1,
        "Foto",
      ),
    ).rejects.toThrow("Envie o arquivo do computador");
  });
  it("cancels loading and never resolves an image after the crop dialog closes", async () => {
    const images: Array<{
      crossOrigin: string;
      src: string;
      onload: (() => void) | null;
      onerror: (() => void) | null;
    }> = [];
    class ImageMock {
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        images.push(this);
      }
    }
    vi.stubGlobal("Image", ImageMock);
    const controller = new AbortController();
    const loading = loadAvatarImage("blob:local-photo", controller.signal);
    expect(images[0].crossOrigin).toBe("anonymous");
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
    expect(images[0]).toMatchObject({ src: "", onload: null, onerror: null });
  });
});
