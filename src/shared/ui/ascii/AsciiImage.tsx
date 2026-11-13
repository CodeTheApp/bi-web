"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { AsciiPattern } from "./AsciiPattern";
import { asciiRows } from "./ascii-frame";
import "./ascii.css";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  aspectRatio?: string | number;
};

/** A per-image reveal. Loading and decoding never gate siblings or navigation. */
export function AsciiImage(props: Props) {
  return <ImageFrame key={props.src} {...props} />;
}

function ImageFrame({
  src,
  alt = "",
  className = "",
  style,
  aspectRatio,
  onLoad,
  onError,
  ...props
}: Props) {
  const image = useRef<HTMLImageElement>(null);
  const glyphs = useRef<HTMLCanvasElement>(null);
  const pixels = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<
    "idle" | "pending" | "revealing" | "ready" | "error"
  >("idle");
  useEffect(() => {
    // A decoded, cached image should appear immediately, without replaying decoration.
    if (image.current?.complete) {
      setPhase(image.current.naturalWidth > 0 ? "ready" : "error");
    } else {
      setPhase("pending");
    }
  }, []);

  const reveal = (img: HTMLImageElement) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("ready");
      return;
    }
    const canvas = glyphs.current;
    const pixelCanvas = pixels.current;
    if (!canvas || !pixelCanvas) {
      setPhase("ready");
      return;
    }
    const width = Math.max(1, Math.round(img.clientWidth));
    const height = Math.max(1, Math.round(img.clientHeight));
    const columns = Math.min(64, Math.max(16, Math.round(width / 9)));
    const rows = Math.min(
      64,
      Math.max(8, Math.round(((columns * height) / width) * 0.62)),
    );
    pixelCanvas.width = columns;
    pixelCanvas.height = rows;
    const sample = pixelCanvas.getContext("2d", { willReadFrequently: true });
    const ink = canvas.getContext("2d");
    if (!sample || !ink) {
      setPhase("ready");
      return;
    }
    // Match object-fit: cover, so the pattern and the final crop share a frame.
    const scale = Math.max(
      width / img.naturalWidth,
      height / img.naturalHeight,
    );
    const sw = width / scale;
    const sh = height / scale;
    sample.drawImage(
      img,
      (img.naturalWidth - sw) / 2,
      (img.naturalHeight - sh) / 2,
      sw,
      sh,
      0,
      0,
      columns,
      rows,
    );
    try {
      const lines = asciiRows(
        sample.getImageData(0, 0, columns, rows).data,
        columns,
        rows,
      );
      canvas.width = columns * 9;
      canvas.height = rows * 14;
      ink.fillStyle = getComputedStyle(img).color;
      ink.font = "12px ui-monospace, monospace";
      ink.textBaseline = "top";
      lines.forEach((line, y) =>
        Array.from(line).forEach((char, x) =>
          ink.fillText(char, x * 9, y * 14),
        ),
      );
    } catch {
      // Cross-origin photos may prohibit pixel reads. Keep the decorative pattern,
      // then reveal the normally loaded photo; never proxy or refetch private media.
      canvas.width = 0;
    }
    setPhase("revealing");
  };

  return (
    <span
      className={`ascii-image ${className}`}
      style={{ aspectRatio, ...style }}
      data-phase={phase}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...props}
        ref={image}
        src={src}
        alt={alt}
        onLoad={(event) => {
          reveal(event.currentTarget);
          onLoad?.(event);
        }}
        onError={(event) => {
          setPhase("error");
          onError?.(event);
        }}
      />
      <span
        className="ascii-image-layer"
        hidden={phase !== "pending" && phase !== "revealing"}
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setPhase("ready");
        }}
      >
        <AsciiPattern />
        <canvas ref={pixels} className="ascii-image-pixel-map" />
        <canvas ref={glyphs} className="ascii-image-glyphs" />
      </span>
      {phase === "error" && (
        <span className="ascii-image-error" role="status">
          Imagem indisponível
        </span>
      )}
    </span>
  );
}
