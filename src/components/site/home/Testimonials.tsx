"use client";
import { useEffect, useRef } from "react";
import type { Testimonial } from "@/lib/content/schema";
import { gsap, onReady, prefersReduced } from "../motion/engine";

/** Depoimentos: troca palavra a palavra, barras de progresso que avançam sozinhas. */
export function Testimonials({ label, items }: { label: string; items: Testimonial[] }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !items.length) return;
    const figs = Array.from(el.querySelectorAll<HTMLElement>(".stage figure"));
    const bars = Array.from(el.querySelectorAll<HTMLButtonElement>(".bars button"));
    const reduced = prefersReduced();
    let cur = 0;
    let barTween: gsap.core.Tween | null = null;
    const ctx = gsap.context(() => {}, el);

    const show = (n: number, first = false) => {
      const prev = figs[cur];
      cur = (n + figs.length) % figs.length;
      const next = figs[cur];
      if (reduced) {
        figs.forEach((f) => f.classList.toggle("on", f === next));
        bars.forEach((b, i) => ((b.querySelector("i") as HTMLElement).style.transform = `scaleX(${i <= cur ? 1 : 0})`));
        return;
      }
      ctx.add(() => {
        bars.forEach((b, i) => gsap.set(b.querySelector("i"), { scaleX: i < cur ? 1 : 0 }));
        // troca por esmaecimento: o depoimento sai e o próximo aparece, sem palavras subindo
        if (!first && prev !== next) gsap.to(prev, { autoAlpha: 0, duration: 0.8, ease: "power1.out", onComplete: () => prev.classList.remove("on") });
        next.classList.add("on");
        gsap.fromTo(next, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: "power2.out", delay: first ? 0 : 0.6 });
        barTween?.kill();
        barTween = gsap.fromTo(bars[cur].querySelector("i"), { scaleX: 0 }, { scaleX: 1, duration: 9, ease: "none", delay: first ? 0 : 0.6, onComplete: () => show(cur + 1) });
      });
    };

    const prevBtn = el.querySelector<HTMLButtonElement>(".prev");
    const nextBtn = el.querySelector<HTMLButtonElement>(".next-q");
    const goPrev = () => show(cur - 1);
    const goNext = () => show(cur + 1);
    prevBtn?.addEventListener("click", goPrev);
    nextBtn?.addEventListener("click", goNext);
    const barHandlers = bars.map((b, i) => {
      const h = () => i !== cur && show(i);
      b.addEventListener("click", h);
      return () => b.removeEventListener("click", h);
    });

    if (reduced) show(0, true);
    const off = reduced ? () => {} : onReady(() => show(0, true));
    return () => {
      off();
      prevBtn?.removeEventListener("click", goPrev);
      nextBtn?.removeEventListener("click", goNext);
      barHandlers.forEach((f) => f());
      barTween?.kill();
      ctx.revert();
    };
  }, [items]);

  if (!items.length) return null;
  return (
    <section className="depo dark" data-nav="dark" ref={root}>
      <div className="wrap">
        <span className="label" data-up>
          {label}
        </span>
        <div className="stage">
          {items.map((t, i) => (
            <figure key={t.id} className={i === 0 ? "on" : undefined}>
              <blockquote>
                <span className="q">“</span>
                {t.quote}
                <span className="q">”</span>
              </blockquote>
              <figcaption>
                {t.author} <span>{t.location}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="ctrl">
          <div className="bars">
            {items.map((t, i) => (
              <button key={t.id} aria-label={`Depoimento ${i + 1}`}>
                <i />
              </button>
            ))}
          </div>
          <div className="arrows">
            <button className="prev" aria-label="Anterior">←</button>
            <button className="next-q" aria-label="Próximo">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}
