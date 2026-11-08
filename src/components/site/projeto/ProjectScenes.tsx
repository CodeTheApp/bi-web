"use client";
import { useEffect } from "react";
import { gsap, onReady, prefersReduced, split } from "../motion/engine";

/** Cenas da página de projeto: abertura da capa, texto que acende, faixa horizontal fixada e próximo projeto. */
export function ProjectScenes() {
  useEffect(() => {
    if (prefersReduced()) return;
    const ctx = gsap.context(() => {
      gsap.to("#pCover", { yPercent: -14, ease: "none", scrollTrigger: { trigger: "#cover", start: "top 80%", end: "bottom top", scrub: true } });
      gsap.to("#cover", { borderRadius: 0, ease: "none", scrollTrigger: { trigger: "#cover", start: "top 60%", end: "center top", scrub: true } });
      const pText = document.getElementById("pText");
      if (pText) gsap.to(split(pText), { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: pText, start: "top 80%", end: "bottom 50%", scrub: true } });
      gsap.fromTo("#pScope span", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: "#pScope", start: "top 90%" } });

      const mm = gsap.matchMedia();
      mm.add("(min-width: 981px)", () => {
        const rail = document.getElementById("rail");
        const sNow = document.getElementById("sNow");
        if (!rail) return;
        const figs = rail.querySelectorAll("figure");
        const dist = () => rail.scrollWidth - window.innerWidth;
        const tween = gsap.to(rail, {
          x: () => -dist(), ease: "none",
          scrollTrigger: {
            trigger: "#strip", start: "top top", end: () => `+=${dist()}`, scrub: 1, pin: ".strip-pin", invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: (s) => {
              if (sNow) sNow.textContent = String(Math.min(figs.length, Math.floor(s.progress * figs.length) + 1)).padStart(2, "0");
            },
          },
        });
        figs.forEach((f) => {
          gsap.to(f.querySelector("img"), { scale: 1, ease: "none", scrollTrigger: { trigger: f, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
        });
      });

      gsap.fromTo("#nTitle", { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: "#next", start: "top bottom", end: "top 40%", scrub: true } });
    });

    const off = onReady(() => {
      ctx.add(() => {
        gsap
          .timeline()
          .fromTo(".crumb", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" })
          .fromTo(split(document.getElementById("pTitle")), { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.08 }, 0.1)
          .fromTo("#pMeta > div", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.5)
          .fromTo("#cover", { clipPath: "inset(30% 10% 0% 10% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.6, ease: "expo.inOut" }, 0.3)
          .fromTo("#pCover", { scale: 1.3 }, { scale: 1, duration: 2, ease: "expo.out" }, 0.4);
      });
    });
    return () => {
      off();
      ctx.revert();
    };
  }, []);
  return null;
}
