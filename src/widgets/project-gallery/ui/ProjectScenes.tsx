"use client";
import { useEffect } from "react";
import { gsap, onReady, prefersReduced, split } from "@/shared/ui/motion/engine";

/**
 * Página de projeto, em tom contido: a capa aparece devagar, o texto acende com a rolagem
 * sem interferir na galeria, que mantém a navegação e ampliação de imagens próprias.
 */
export function ProjectScenes() {
  useEffect(() => {
    if (prefersReduced()) return;

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
      ctx.revert();
    };
  }, []);
  return null;
}
