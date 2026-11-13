"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicProduct } from "@/entities/product";
import type { SectionKey, SiteContent } from "@/entities/site-content";
import { readPreviewDraft } from "@/features/page-preview/model/protocol";
import { PreviewFrameBridge } from "@/features/page-preview";
import { HomeContentView } from "./HomeContentView";

/** The public composition is rendered again locally; typing never crosses a save endpoint. */
export function LiveHomePreview({ content, sectionKey, shopProducts }: { content: SiteContent; sectionKey: SectionKey; shopProducts: PublicProduct[] }) {
  const [draft, setDraft] = useState(content.sections[sectionKey]);
  const revision = useRef(-1);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (window.parent === window) return;
      const message = readPreviewDraft(event.data, event.origin, window.location.origin, event.source, window.parent, sectionKey);
      if (!message || message.revision < revision.current) return;
      revision.current = message.revision;
      setDraft(message.draft);
    };
    window.addEventListener("message", receive);
    if (window.parent !== window) window.parent.postMessage({ type: "bi:preview:ready", key: sectionKey }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [sectionKey]);
  return <div className="site-section-preview"><HomeContentView content={{ ...content, sections: { ...content.sections, [sectionKey]: draft } }} onlySection={sectionKey} shopProducts={shopProducts} /><PreviewFrameBridge /></div>;
}
