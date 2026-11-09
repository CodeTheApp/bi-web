"use client";
import { useEffect } from "react";
import { gsap, onReady, prefersReduced, split } from "../motion/engine";

/**
 * Página de projeto, em tom contido: a capa aparece devagar, o texto acende com a rolagem
 * e a faixa de fotos rola de lado por conta própria (setas, arraste ou trackpad), sem prender a página.
 */
export function ProjectScenes() {
  useEffect(() => {
    // faixa de fotos: contador e setas funcionam com ou sem movimento reduzido
    const rail = document.getElementById("rail");
    const sNow = document.getElementById("sNow");
    const figs = rail ? Array.from(rail.querySelectorAll("figure")) : [];
    const onRail = () => {
      if (!rail || !sNow || !figs.length) return;
      const step = figs[0].getBoundingClientRect().width + 22;
      const k = Math.min(figs.length - 1, Math.round(rail.scrollLeft / step));
      sNow.textContent = String(k + 1).padStart(2, "0");
    };
    const go = (dir: number) => () => {
      if (!rail || !figs.length) return;
      rail.scrollBy({ left: dir * (figs[0].getBoundingClientRect().width + 22), behavior: prefersReduced() ? "auto" : "smooth" });
    };
    const prev = document.getElementById("railPrev");
    const next = document.getElementById("railNext");
    const goPrev = go(-1), goNext = go(1);
    rail?.addEventListener("scroll", onRail, { passive: true });
    prev?.addEventListener("click", goPrev);
    next?.addEventListener("click", goNext);
    const cleanupRail = () => {
      rail?.removeEventListener("scroll", onRail);
      prev?.removeEventListener("click", goPrev);
      next?.removeEventListener("click", goNext);
    };
    if (prefersReduced()) return cleanupRail;

    const ctx = gsap.context(() => {
      gsap.to("#pCover", { yPercent: -5, ease: "none", scrollTrigger: { trigger: "#cover", start: "top 80%", end: "bottom top", scrub: true } });
      const pText = document.getElementById("pText");
      if (pText) gsap.to(split(pText), { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: pText, start: "top 80%", end: "bottom 50%", scrub: true } });
      gsap.fromTo("#pScope span", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 1, ease: "power2.out", scrollTrigger: { trigger: "#pScope", start: "top 90%" } });
      gsap.fromTo("#nTitle", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: "power2.out", scrollTrigger: { trigger: "#next", start: "top 75%" } });
    });

    const off = onReady(() => {
      ctx.add(() => {
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .fromTo(".crumb", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 })
          .fromTo("#pTitle", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.15)
          .fromTo("#pMeta > div", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, stagger: 0.08 }, 0.5)
          .fromTo("#cover", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8, ease: "power1.out" }, 0.3)
          .fromTo("#pCover", { scale: 1.04 }, { scale: 1, duration: 2.6 }, 0.3);
      });
    });
    return () => {
      off();
      cleanupRail();
      ctx.revert();
    };
  }, []);
  return null;
}
