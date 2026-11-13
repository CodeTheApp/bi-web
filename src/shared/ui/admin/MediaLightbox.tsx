"use client";

import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Icon } from "@/shared/ui/admin/icons";
import { ControlTooltip } from "@/shared/ui/admin/ui";
import "@/shared/ui/admin/MediaLightbox.css";

const styles = {
  overlay: "media-lightbox-overlay", dialog: "media-lightbox", toolbar: "media-lightbox-toolbar", info: "media-lightbox-info",
  title: "media-lightbox-title", description: "media-lightbox-description", actions: "media-lightbox-actions", action: "media-lightbox-action",
  navigation: "media-lightbox-navigation", iconButton: "media-lightbox-icon-button", close: "media-lightbox-close", stage: "media-lightbox-stage",
  canvas: "media-lightbox-canvas", imageButton: "media-lightbox-image-button", image: "media-lightbox-image", zoomed: "media-lightbox-zoomed",
  state: "media-lightbox-state", loading: "media-lightbox-loading", footer: "media-lightbox-footer",
} as const;

export type LightboxImage = { id: string; url: string; name: string; alt?: string; category?: string; kind?: "image" | "video"; mimeType?: string };
type Props = { items: LightboxImage[]; index: number | null; onIndexChange: (index: number | null) => void };

/** Full original images, without the library's thumbnail crop. */
export function MediaLightbox({ items, index, onIndexChange }: Props) {
  const opener = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const active = index === null ? -1 : Math.max(0, Math.min(index, items.length - 1));
  const item = items[active];
  const move = (direction: -1 | 1) => {
    const next = active + direction;
    if (next >= 0 && next < items.length) onIndexChange(next);
  };

  return (
    <Dialog.Root open={Boolean(item)} onOpenChange={(open) => { if (!open) onIndexChange(null); }}>
      {item && (
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            ref={dialog}
            className={`adm ${styles.dialog}`}
            data-media-lightbox=""
            onOpenAutoFocus={(event) => {
              opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
              event.preventDefault();
              dialog.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }}
            onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); onIndexChange(null); }}
            onKeyDownCapture={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onIndexChange(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.altKey || event.metaKey || event.ctrlKey || event.target instanceof HTMLVideoElement) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                event.stopPropagation();
                move(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
          >
            {item.kind === "video" || item.mimeType?.startsWith("video/") ? <VideoViewer key={`${item.id}:${item.url}`} item={item} index={active} total={items.length} onMove={move} onClose={() => onIndexChange(null)} /> : <ImageViewer item={item} index={active} total={items.length} onMove={move} onClose={() => onIndexChange(null)} />}
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}

function ImageViewer({ item, index, total, onMove, onClose }: { item: LightboxImage; index: number; total: number; onMove: (direction: -1 | 1) => void; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointer: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const ignoreClick = useRef(false);
  const [zoomed, setZoomed] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState(`${item.id}:${item.url}`);
  if (source !== `${item.id}:${item.url}`) {
    setSource(`${item.id}:${item.url}`);
    setZoomed(false);
    setNatural(null);
    setFailed(false);
  }

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = stage.current;
      if (!element) return;
      element.scrollLeft = zoomed ? (element.scrollWidth - element.clientWidth) / 2 : 0;
      element.scrollTop = zoomed ? (element.scrollHeight - element.clientHeight) / 2 : 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomed, viewport]);

  const fit = natural && viewport.width && viewport.height ? Math.min(1, Math.max(1, viewport.width - 48) / natural.width, Math.max(1, viewport.height - 48) / natural.height) : null;
  const width = natural && fit ? natural.width * fit * (zoomed ? 2 : 1) : undefined;
  const height = natural && fit ? natural.height * fit * (zoomed ? 2 : 1) : undefined;
  const canvasStyle: CSSProperties = zoomed && width && height ? { width: Math.max(viewport.width, width + 48), height: Math.max(viewport.height, height + 48) } : {};
  const zoomLabel = zoomed ? "Ajustar à tela" : "Ampliar 2×";
  const endGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointer !== event.pointerId) return;
    if (!gesture.current.moved && event.type !== "pointercancel") setZoomed(false);
    ignoreClick.current = true;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    delete event.currentTarget.dataset.dragging;
    window.setTimeout(() => { ignoreClick.current = false; }, 0);
  };

  return (
    <>
      <header className={styles.toolbar}>
        <div className={styles.info}>
          <Dialog.Title className={styles.title}>{item.name || "Imagem"}</Dialog.Title>
          <Dialog.Description className={styles.description}>{item.category || "Sem categoria"}<span aria-hidden="true"> · </span>{index + 1} de {total}</Dialog.Description>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => setZoomed((value) => !value)} disabled={!natural || failed} aria-pressed={zoomed}><Icon name={zoomed ? "eye" : "plus"} />{zoomLabel}</button>
          <a className={styles.action} href={item.url} target="_blank" rel="noopener noreferrer"><Icon name="ext" />Original</a>
          <div className={styles.navigation} role="group" aria-label="Navegar pelas imagens">
            <ControlTooltip label="Imagem anterior (←)"><button type="button" className={styles.iconButton} aria-label="Imagem anterior" disabled={index === 0} onClick={() => onMove(-1)}><Icon name="back" /></button></ControlTooltip>
            <ControlTooltip label="Próxima imagem (→)"><button type="button" className={styles.iconButton} aria-label="Próxima imagem" disabled={index === total - 1} onClick={() => onMove(1)}><Icon name="back" style={{ rotate: "180deg" }} /></button></ControlTooltip>
          </div>
        </div>
        <ControlTooltip label="Fechar imagem (Esc)"><button type="button" className={styles.close} aria-label="Fechar imagem" onClick={onClose}><Icon name="x" /></button></ControlTooltip>
      </header>
      <div
        ref={stage}
        className={`${styles.stage}${zoomed ? ` ${styles.zoomed}` : ""}`}
        onPointerDown={(event) => {
          if (!zoomed || event.button !== 0) return;
          const element = event.currentTarget;
          gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop, moved: false };
          element.setPointerCapture(event.pointerId);
          element.dataset.dragging = "true";
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.pointer !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
          event.currentTarget.scrollLeft = start.left - dx;
          event.currentTarget.scrollTop = start.top - dy;
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      >
        <div className={styles.canvas} style={canvasStyle}>
          {failed ? <p className={styles.state} role="alert">Não foi possível carregar esta imagem. Tente abrir o arquivo original.</p> : (
            <button type="button" className={styles.imageButton} style={{ width, height }} aria-label={zoomLabel} tabIndex={-1} onClick={() => { if (!ignoreClick.current && natural) setZoomed((value) => !value); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={`${item.id}:${item.url}`} src={item.url} alt={item.alt || item.name} draggable={false} className={styles.image} onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setFailed(true)} />
            </button>
          )}
          {!natural && !failed && <p className={styles.loading} role="status">Carregando imagem…</p>}
        </div>
      </div>
      <footer className={styles.footer}>
        <span>{zoomed ? "Arraste a foto para explorar os detalhes." : "Foto inteira · clique para ampliar"}</span>
        {natural && <span>{natural.width} × {natural.height} px</span>}
      </footer>
    </>
  );
}


function VideoViewer({ item, index, total, onMove, onClose }: { item: LightboxImage; index: number; total: number; onMove: (direction: -1 | 1) => void; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  return <>
    <header className={styles.toolbar}><div className={styles.info}><Dialog.Title className={styles.title}>{item.name || "Vídeo"}</Dialog.Title><Dialog.Description className={styles.description}>{item.category || "Sem categoria"} · {index + 1} de {total}</Dialog.Description></div><div className={styles.actions}>
      <a className={styles.action} href={item.url} target="_blank" rel="noopener noreferrer"><Icon name="ext" />Original</a>
      <div className={styles.navigation} role="group" aria-label="Navegar pelos arquivos"><ControlTooltip label="Arquivo anterior (←)"><button type="button" className={styles.iconButton} aria-label="Arquivo anterior" disabled={index === 0} onClick={() => onMove(-1)}><Icon name="back" /></button></ControlTooltip><ControlTooltip label="Próximo arquivo (→)"><button type="button" className={styles.iconButton} aria-label="Próximo arquivo" disabled={index === total - 1} onClick={() => onMove(1)}><Icon name="back" style={{ rotate: "180deg" }} /></button></ControlTooltip></div>
    </div><ControlTooltip label="Fechar vídeo (Esc)"><button type="button" className={styles.close} aria-label="Fechar vídeo" onClick={onClose}><Icon name="x" /></button></ControlTooltip></header>
    <div className={`${styles.stage} media-lightbox-video-stage`}>{failed ? <p className={styles.state} role="alert">Este navegador não conseguiu reproduzir o vídeo. Tente abrir o arquivo original.</p> : <video className="media-lightbox-video" src={item.url} controls playsInline preload="metadata" aria-label={item.alt || item.name} onError={() => setFailed(true)} />}</div>
    <footer className={styles.footer}><span>Vídeo · use os controles para reproduzir ou ver em tela cheia.</span></footer>
  </>;
}
