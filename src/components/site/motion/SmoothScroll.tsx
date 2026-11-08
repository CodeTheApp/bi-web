"use client";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, markReady, motion, prefersReduced, ScrollTrigger, scrollToEl } from "./engine";

/**
 * Motor do site, montado uma vez no layout: rolagem suave (Lenis) ligada ao ScrollTrigger,
 * âncoras internas, cursor, e o preloader da primeira visita.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    motion.reduced = prefersReduced();
    root.classList.remove("no-js");
    root.classList.toggle("reduced", motion.reduced);

    const offs: Array<() => void> = [];

    // âncoras da mesma página com rolagem suave
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || url.hash.length < 2) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      window.dispatchEvent(new Event("bi:closemenu"));
      history.replaceState(null, "", url.hash);
      scrollToEl(el);
    };
    document.addEventListener("click", onClick);
    offs.push(() => document.removeEventListener("click", onClick));

    if (!motion.reduced) {
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      motion.lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      offs.push(() => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        motion.lenis = null;
      });

      // cursor: ponto + anel que vira etiqueta sobre [data-cursor]
      if (window.matchMedia("(pointer:fine)").matches) {
        const dot = document.querySelector<HTMLElement>(".cur-dot");
        const ring = document.querySelector<HTMLElement>(".cur-ring");
        if (dot && ring) {
          const dx = gsap.quickTo(dot, "x", { duration: 0.15 }), dy = gsap.quickTo(dot, "y", { duration: 0.15 });
          const rx = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });
          const move = (e: MouseEvent) => (dx(e.clientX), dy(e.clientY), rx(e.clientX), ry(e.clientY));
          let current: Element | null = null;
          const over = (e: MouseEvent) => {
            const el = (e.target as Element | null)?.closest?.("[data-cursor]") ?? null;
            if (el === current) return;
            current = el;
            if (el) {
              ring.textContent = (el as HTMLElement).dataset.cursor ?? "";
              ring.classList.add("on");
              gsap.to(dot, { scale: 0, duration: 0.3 });
            } else {
              ring.classList.remove("on");
              gsap.to(dot, { scale: 1, duration: 0.3 });
            }
          };
          window.addEventListener("mousemove", move);
          document.addEventListener("mouseover", over);
          offs.push(() => {
            window.removeEventListener("mousemove", move);
            document.removeEventListener("mouseover", over);
          });
        }
      }
    }

    // preloader (só na primeira visita da sessão)
    const pre = document.querySelector<HTMLElement>(".pre");
    let seen = false;
    try {
      seen = !!sessionStorage.getItem("bi-pre");
      sessionStorage.setItem("bi-pre", "1");
    } catch {}
    const done = () => {
      markReady();
      ScrollTrigger.refresh();
    };
    if (!pre || motion.reduced || seen) {
      if (pre) pre.style.display = "none";
      done();
    } else {
      const cnt = pre.querySelector(".count");
      const sym = pre.querySelector(".sym");
      const o = { v: 0 };
      const tl = gsap.timeline({ onComplete: () => void (pre.style.display = "none") });
      tl.fromTo(sym, { scale: 0.6, autoAlpha: 0, rotate: -90 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 1, ease: "expo.out" })
        .to(o, { v: 100, duration: 1.1, ease: "power2.inOut", onUpdate: () => void (cnt && (cnt.textContent = String(Math.round(o.v)))) }, 0)
        .to(sym, { scale: 18, autoAlpha: 0, duration: 1, ease: "expo.in" }, 1.05)
        .to(pre, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, 1.35)
        .add(done, 1.55);
      offs.push(() => void tl.kill());
    }

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    offs.push(() => window.removeEventListener("load", onLoad));
    return () => offs.forEach((f) => f());
  }, []);

  // troca de página: volta ao topo (ou à âncora) sem animação
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    motion.lenis?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
