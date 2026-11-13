"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, ExternalLink, Monitor, Smartphone } from "@/shared/ui/icons/lucide";
import { Button } from "@/shared/ui/button";
import { SECTION_NAMES, type SectionKey, type Section } from "@/entities/site-content";
import { draftMessage, previewReadySchema } from "../model/protocol";
import "./section-preview.css";
import { ControlTooltip } from "@/shared/ui/admin/ui";

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const;

export function SectionPreviewPanel({
  section,
  draft,
  revision,
  expanded,
  onToggle,
  pending,
}: {
  section: SectionKey;
  draft: Section;
  revision: number;
  expanded: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  const contentId = useId();
  const canvas = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const latestDraft = useRef({ section, draft, revision });
  useEffect(() => { latestDraft.current = { section, draft, revision }; });
  const [width, setWidth] = useState(400);
  const [loadedHref, setLoadedHref] = useState<string | null>(null);
  const [device, setDevice] = useState<keyof typeof VIEWPORTS>("desktop");
  const viewport = VIEWPORTS[device];
  const scale = Math.min(1, width / viewport.width);

  useEffect(() => {
    const node = canvas.current;
    if (!node || !expanded) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    return () => resize.disconnect();
  }, [expanded]);

  // The browsing context survives keystrokes, autosaves and collapsing the panel.
  const href = `/preview/home/${section}`;
  const sendDraft = () => {
    const current = latestDraft.current;
    frame.current?.contentWindow?.postMessage(draftMessage(current.section, current.draft, current.revision), window.location.origin);
  };
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(draftMessage(section, draft, revision), window.location.origin);
  }, [section, draft, revision]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = previewReadySchema.safeParse(event.data);
      if (message.success && message.data.key === section) {
        const current = latestDraft.current;
        frame.current?.contentWindow?.postMessage(draftMessage(current.section, current.draft, current.revision), window.location.origin);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [section]);
  const loading = loadedHref !== href;

  return (
    <aside
      className={`card section-preview${expanded ? " is-expanded" : " is-collapsed"}`}
      aria-label="Pré-visualização da seção"
    >
      <div className="section-preview-bar">
        <button
          type="button"
          className="section-preview-toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => {
            onToggle();
          }}
        >
          <ChevronRight
            size={15}
            className={expanded ? "is-open" : undefined}
          />
          <span>Pré-visualização</span>
        </button>
        <div className="section-preview-actions" inert={!expanded} aria-hidden={!expanded}>
            <ControlTooltip label="Visualizar desktop · 1280 × 800">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Visualizar desktop"
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Monitor size={15} />
              </Button>
            </ControlTooltip>
            <ControlTooltip label="Visualizar celular · 390 × 844">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Visualizar celular"
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone size={15} />
              </Button>
            </ControlTooltip>
            <ControlTooltip label="Abrir versão salva em outra aba">
              <a
                className="section-preview-external"
                href={href}
                target="_blank"
                rel="noopener"
                aria-label="Abrir versão salva em outra aba"
              >
                <ExternalLink size={15} />
              </a>
            </ControlTooltip>
          </div>
      </div>
      <div
        id={contentId}
        className="section-preview-content"
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className="section-preview-inner">
          <div
            className="section-preview-canvas"
            ref={canvas}
            aria-busy={expanded && loading}
          >
              <div
                style={{
                  height: viewport.height * scale,
                  position: "relative",
                  width: viewport.width * scale,
                  marginInline: "auto",
                overflow: "hidden",
                }}
              >
                {/* Keep the browsing viewport fixed: measuring a 100svh section back into
                the iframe height would continuously change its own layout. */}
                <iframe
                  ref={frame}
                  title={`Prévia de ${SECTION_NAMES[section]} — ${device === "desktop" ? "desktop" : "celular"}`}
                  src={href}
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="same-origin"
                  onLoad={() => { setLoadedHref(href); sendDraft(); }}
                  style={{
                    width: viewport.width,
                    height: viewport.height,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    border: 0,
                    position: "absolute",
                    inset: 0,
                  }}
                />
              </div>
          </div>
          <p className="section-preview-status" role="status">
            {pending
              ? "Prévia ao vivo · alterações ainda não salvas"
              : loading
                ? "Carregando prévia…"
                : "Prévia ao vivo · envios desativados"}
          </p>
        </div>
      </div>
    </aside>
  );
}
