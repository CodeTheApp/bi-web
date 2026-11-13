"use client";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, markReady, motion, prefersReduced, ScrollTrigger, scrollToEl } from "@/shared/ui/motion/engine";

/**
 * Motor do site, montado uma vez no layout: rolagem suave (Lenis) ligada ao ScrollTrigger
 * e âncoras internas. Sem cursor personalizado nem preloader: a entrada é o próprio hero.
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
      const lenis = new Lenis({ lerp: 0.12, smoothWheel: true });
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
    }

    markReady();
    ScrollTrigger.refresh();

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
