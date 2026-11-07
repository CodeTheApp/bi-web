"use client";
import { useEffect } from "react";
import { gsap, magnetic, motion, prefersReduced, reveals, ScrollTrigger, scrollToEl } from "./engine";

/**
 * Revelações genéricas da página. Fica por último na página: os efeitos dos irmãos anteriores
 * (cenas fixadas com pin) rodam antes, como no protótipo.
 */
export function PageMotion() {
  useEffect(() => {
    const scope = document.querySelector("main");
    if (!scope) return;
    if (prefersReduced()) return;
    const ctx = gsap.context(() => reveals(scope), scope);
    const offMag = magnetic(document.body);
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    motion.lenis?.resize();
    // chegou com âncora (ex.: /#contato vindo de um projeto)
    const id = location.hash.slice(1);
    let t: number | undefined;
    if (id) t = window.setTimeout(() => scrollToEl(document.getElementById(decodeURIComponent(id)), true), 60);
    return () => {
      window.clearTimeout(t);
      offMag();
      ctx.revert();
    };
  }, []);
  return null;
}
