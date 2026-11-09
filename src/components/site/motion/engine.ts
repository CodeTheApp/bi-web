"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/** Estado compartilhado do motor de movimento (uma instância por aba). */
export const motion = {
  lenis: null as Lenis | null,
  ready: false,
  reduced: false,
};

export function prefersReduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Chama `cb` quando o preloader terminar (ou já, se ele já terminou). */
export function onReady(cb: () => void) {
  if (motion.ready) {
    cb();
    return () => {};
  }
  const h = () => cb();
  window.addEventListener("bi:ready", h, { once: true });
  return () => window.removeEventListener("bi:ready", h);
}

export function markReady() {
  motion.ready = true;
  window.dispatchEvent(new Event("bi:ready"));
}

/** Quebra o texto em palavras mascaradas (.w > .wi). Elementos com data-nosplit ficam inteiros. */
export function split(el: Element | null): HTMLElement[] {
  if (!el) return [];
  const host = el as HTMLElement;
  if (host.dataset.splitDone) return Array.from(host.querySelectorAll<HTMLElement>(".wi"));
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (n.textContent ?? "").split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const w = document.createElement("span");
          w.className = "w";
          const i = document.createElement("span");
          i.className = "wi";
          i.textContent = p;
          w.appendChild(i);
          frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      } else if (n instanceof HTMLElement && !n.classList.contains("w") && n.tagName !== "BR" && !n.hasAttribute("data-nosplit")) {
        walk(n);
      }
    });
  };
  walk(host);
  host.dataset.splitDone = "1";
  return Array.from(host.querySelectorAll<HTMLElement>(".wi"));
}

export function scrollToEl(el: Element | null, immediate = false) {
  if (!el) return;
  if (motion.lenis) motion.lenis.scrollTo(el as HTMLElement, { offset: -10, duration: 1.6, immediate });
  else el.scrollIntoView({ behavior: immediate || motion.reduced ? "auto" : "smooth" });
}

/**
 * Revelações por atributo, de propósito discretas: só opacidade e poucos pixels de deslocamento,
 * sem cortinas, giros ou zoom. (A marca pede calma; o movimento acompanha, não aparece.)
 * data-split / data-up / data-stagger / data-clip / data-parallax / data-line / data-count
 */
const CALM = { duration: 1.1, ease: "power2.out" } as const;

export function reveals(scope: Element) {
  const q = <T extends Element = HTMLElement>(sel: string) => Array.from(scope.querySelectorAll<T & Element>(sel)) as unknown as T[];
  const fadeUp = (targets: gsap.TweenTarget, trigger: Element, y = 18, extra: gsap.TweenVars = {}) =>
    gsap.fromTo(targets, { y, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ...CALM, ...extra, scrollTrigger: { trigger, start: "top 88%" } });

  q<HTMLElement>("[data-split]").forEach((el) => fadeUp(el, el, 16));
  q<HTMLElement>("[data-up]").forEach((el) => fadeUp(el, el, 16, { delay: parseFloat(el.dataset.up ?? "") || 0 }));
  q<HTMLElement>("[data-stagger]").forEach((el) => fadeUp(el.children, el, 14, { stagger: 0.06 }));
  q<HTMLElement>("[data-clip]").forEach((el) => {
    const img = el.querySelector("img");
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 88%" } });
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, ease: "power1.out" });
    if (img) tl.fromTo(img, { scale: 1.04 }, { scale: 1, duration: 2.2, ease: "power2.out" }, 0);
  });
  q<HTMLElement>("[data-parallax]").forEach((el) => {
    const amt = (parseFloat(el.dataset.parallax ?? "") || 8) * 0.35;
    gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });
  q<HTMLElement>("[data-line]").forEach((el) => {
    gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", duration: 1.4, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 92%" } });
  });
  q<HTMLElement>("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count ?? "0");
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" }, onUpdate: () => void (el.textContent = String(Math.round(o.v))) });
  });
}

export { gsap, ScrollTrigger };
