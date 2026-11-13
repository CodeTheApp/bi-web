"use client";
import { ArrowRight } from "@/shared/ui/icons/lucide";

import { useEffect, useRef, useState } from "react";
import type { Section } from "@/entities/site-content";
import { gsap, onReady, prefersReduced } from "@/shared/ui/motion/engine";

export type HeroSlide = { src: string; alt: string; credit: { title: string; place: string; href: string } | null };

/** Tempo de cada foto. Longo de propósito: a troca deve ser percebida, não notada. */
const DUR = 8000;

/**
 * Hero editorial. Na entrada a luz "acende" como um dimmer (o escuro se dissolve e um brilho âmbar
 * aparece); as fotos dos projetos trocam devagar, com um zoom quase imperceptível.
 */
export function Hero({ section, slides }: { section: Section; slides: HeroSlide[] }) {
  const root = useRef<HTMLElement>(null);
  const [lit, setLit] = useState(false);
  const [i, setI] = useState(0);
  const [clock, setClock] = useState(0);
  const visible = useRef(true);
  const n = slides.length;
  const cur = slides[i] ?? slides[0];

  // a luz acende quando a página está pronta
  useEffect(() => onReady(() => requestAnimationFrame(() => setLit(true))), []);

  // troca de foto: só com o hero na tela e a aba visível; nada com movimento reduzido
  useEffect(() => {
    if (n < 2 || prefersReduced()) return;
    const t = window.setTimeout(() => {
      if (visible.current && !document.hidden) setI((x) => (x + 1) % n);
      else setClock((c) => c + 1); // fora da tela: espera mais uma rodada sem trocar
    }, DUR);
    return () => window.clearTimeout(t);
  }, [i, n, clock]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => void (visible.current = e.isIntersecting));
    io.observe(el);
    if (prefersReduced()) return () => io.disconnect();
    // rolagem: a foto desce um pouco mais devagar que a página e o texto se apaga; nada fica preso
    const ctx = gsap.context(() => {
      gsap.to(".hero-stage", { yPercent: 8, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
      gsap.fromTo(".hero-copy, .hero-foot", { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, ease: "none", immediateRender: false, scrollTrigger: { trigger: el, start: "top top", end: "60% top", scrub: true } });
    }, el);
    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <section className={`hero${lit ? " lit" : ""}`} id="inicio" data-nav="dark" ref={root} aria-roledescription="destaque">
      <div className="hero-stage">
        {slides.map((s, k) => (
          <div key={s.src} className={`hero-slide${k === i ? " on" : ""}`} aria-hidden={k !== i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={k === i ? s.alt : ""} fetchPriority={k === 0 ? "high" : "low"} loading={k === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
      <div className="hero-veil" />
      <div className="hero-glow" />
      <div className="hero-dim" />

      <div className="wrap hero-copy">
        <span className="hero-kicker rise d1">
          <i />
          {section.label}
        </span>
        <h1 className="hero-title">
          <span className="ln rise d2">{section.title}</span>
          {section.title2 && <span className="ln soft rise d3">{section.title2}</span>}
        </h1>
        <p className="hero-sub rise d4">{section.text}</p>
        <div className="hero-acts rise d4">
          <a className="btn-line" href="#contato">
            {section.cta || "Agende uma conversa"}
          </a>
          <a className="ulink" href="#portfolio">
            Ver projetos <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="wrap hero-foot">
        <div className="hero-index rise d5" aria-hidden={n < 2}>
          {n > 1 && (
            <>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="bar">
                <i key={i} className={lit ? "run" : undefined} style={{ ["--dur" as string]: `${DUR}ms` }} />
              </span>
              <span className="of">{String(n).padStart(2, "0")}</span>
            </>
          )}
        </div>
        {cur?.credit ? (
          <a key={cur.credit.href} className="hero-credit rise d5" href={cur.credit.href} aria-live="polite">
            <span className="k">{cur.credit.place}</span>
            <span className="t">{cur.credit.title}</span>
          </a>
        ) : (
          <span />
        )}
        <span className="hero-scroll rise d5" aria-hidden="true">
          Role
          <i />
        </span>
      </div>
    </section>
  );
}
