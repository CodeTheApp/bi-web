"use client";
import { useRef, useState } from "react";
import type { Faq as FaqItem } from "@/lib/content/schema";
import { gsap, prefersReduced, ScrollTrigger } from "../motion/engine";

export function Faq({ label, title, items }: { label: string; title: string; items: FaqItem[] }) {
  if (!items.length) return null;
  return (
    <section className="faq">
      <div className="wrap grid">
        <div>
          <span className="label" data-up>
            {label}
          </span>
          <h2 className="h-l" style={{ marginTop: 24, color: "var(--marrom-intenso)" }} data-split>
            {title}
          </h2>
        </div>
        <div data-stagger>
          {items.map((f, i) => (
            <Qa key={f.id} item={f} initiallyOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Qa({ item, initiallyOpen }: { item: FaqItem; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const ans = useRef<HTMLDivElement>(null);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    const el = ans.current;
    if (!el) return;
    if (prefersReduced()) {
      el.style.height = next ? "auto" : "0px";
      return;
    }
    gsap.to(el, { height: next ? "auto" : 0, duration: 0.7, ease: "expo.out", onComplete: () => ScrollTrigger.refresh() });
  };
  return (
    <div className={`qa${open ? " open" : ""}`}>
      <button aria-expanded={open} onClick={toggle}>
        {item.question}
        <span className="pm" />
      </button>
      <div className="ans" ref={ans} style={initiallyOpen ? { height: "auto" } : undefined}>
        <p>{item.answer}</p>
      </div>
    </div>
  );
}
