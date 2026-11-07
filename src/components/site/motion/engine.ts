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

/** Revelações genéricas por atributo: data-split, data-up, data-stagger, data-clip, data-parallax, data-line, data-count. */
export function reveals(scope: Element) {
  const q = <T extends Element = HTMLElement>(sel: string) => Array.from(scope.querySelectorAll<T & Element>(sel)) as unknown as T[];

  q<HTMLElement>("[data-split]").forEach((el) => {
    gsap.fromTo(split(el), { yPercent: 110 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.045, scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  q<HTMLElement>("[data-up]").forEach((el) => {
    gsap.fromTo(el, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, ease: "expo.out", delay: parseFloat(el.dataset.up ?? "") || 0, scrollTrigger: { trigger: el, start: "top 90%" } });
  });
  q<HTMLElement>("[data-stagger]").forEach((el) => {
    gsap.fromTo(el.children, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.09, scrollTrigger: { trigger: el, start: "top 86%" } });
  });
  q<HTMLElement>("[data-clip]").forEach((el) => {
    const img = el.querySelector("img");
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%" } });
    tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" });
    if (img) tl.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.9, ease: "expo.out" }, 0.15);
  });
  q<HTMLElement>("[data-parallax]").forEach((el) => {
    const amt = parseFloat(el.dataset.parallax ?? "") || 12;
    gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });
  q<HTMLElement>("[data-line]").forEach((el) => {
    gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 92%" } });
  });
  q<HTMLElement>("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count ?? "0");
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" }, onUpdate: () => void (el.textContent = String(Math.round(o.v))) });
  });
}

/** Botões que seguem o cursor (data-magnetic=".3"). Retorna a limpeza. */
export function magnetic(scope: Element) {
  if (!window.matchMedia("(pointer:fine)").matches || motion.reduced) return () => {};
  const offs: Array<() => void> = [];
  scope.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const s = parseFloat(el.dataset.magnetic ?? "") || 0.35;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * s, y: (e.clientY - r.top - r.height / 2) * s, duration: 0.6, ease: "power3.out" });
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1,.4)" });
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    offs.push(() => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    });
  });
  return () => offs.forEach((f) => f());
}

export { gsap, ScrollTrigger };
