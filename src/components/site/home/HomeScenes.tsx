"use client";
import { useEffect } from "react";
import { gsap, prefersReduced, ScrollTrigger, split } from "../motion/engine";

/** Cenas de rolagem da home (manifesto que acende, letreiro, cobogó, formas na horizontal, luminotécnico fixado). */
export function HomeScenes({ stepCaptions }: { stepCaptions: string[] }) {
  useEffect(() => {
    // fotos dentro do texto: toque abre/fecha (no mouse, o :hover já resolve)
    const pills = Array.from(document.querySelectorAll<HTMLElement>("#lightup .pill"));
    const closeAll = () => pills.forEach((o) => o.classList.remove("open"));
    const onPill = (e: Event) => {
      e.stopPropagation();
      const p = e.currentTarget as HTMLElement;
      const on = !p.classList.contains("open");
      closeAll();
      p.classList.toggle("open", on);
    };
    pills.forEach((p) => p.addEventListener("click", onPill));
    document.addEventListener("click", closeAll);
    const cleanupPills = () => {
      pills.forEach((p) => p.removeEventListener("click", onPill));
      document.removeEventListener("click", closeAll);
    };
    if (prefersReduced()) return cleanupPills;

    const tickers: Array<() => void> = [];
    const ctx = gsap.context(() => {
      const lightup = document.getElementById("lightup");
      if (lightup) {
        const lw = split(lightup);
        lightup.querySelectorAll(".hl-w .wi").forEach((w) => w.classList.add("hl"));
        gsap.to(lw, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: lightup, start: "top 78%", end: "bottom 42%", scrub: true } });
        gsap.fromTo("#lightup .pill", { width: 0 }, { width: "2.4em", ease: "expo.out", duration: 1.4, stagger: 0.2, scrollTrigger: { trigger: lightup, start: "top 70%" } });
      }

      const row = document.querySelector<HTMLElement>(".marq .row");
      if (row) {
        let x = 0, vel = 0;
        ScrollTrigger.create({ trigger: ".marq", start: "top bottom", end: "bottom top", onUpdate: (s) => void (vel = s.getVelocity() / 300) });
        const tick = () => {
          const half = row.scrollWidth / 2;
          x -= 1.1 + Math.abs(vel);
          vel *= 0.9;
          if (x <= -half) x += half;
          row.style.transform = `translateX(${x}px)`;
        };
        gsap.ticker.add(tick);
        tickers.push(() => gsap.ticker.remove(tick));
      }

      const tiles = gsap.utils.toArray<SVGElement>("#wall .c svg");
      if (tiles.length)
        gsap.fromTo(
          tiles,
          { rotate: () => (Math.floor(Math.random() * 3) + 1) * 90, scale: 0.2, opacity: 0 },
          { rotate: 0, scale: 1, opacity: 1, ease: "power2.out", stagger: { each: 0.03, from: "center", grid: "auto" }, scrollTrigger: { trigger: "#wall", start: "top 92%", end: "bottom 55%", scrub: 1 } },
        );

      gsap.to(".camila .badge svg", { rotate: 360, ease: "none", scrollTrigger: { trigger: ".camila", start: "top bottom", end: "bottom top", scrub: true } });

      const mm = gsap.matchMedia();
      mm.add("(min-width: 981px)", () => {
        const track = document.getElementById("track");
        if (track) {
          const dist = () => track.scrollWidth - window.innerWidth;
          gsap.to(track, {
            x: () => -dist(), ease: "none",
            scrollTrigger: { trigger: ".modes", start: "top top", end: () => `+=${dist()}`, scrub: 1, pin: ".modes-pin", invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (s) => void gsap.set("#modesProg", { scaleX: s.progress }) },
          });
          gsap.utils.toArray<HTMLElement>(".mcard").forEach((c, i) => {
            gsap.fromTo(c, { rotate: 3 + i, y: 60 }, { rotate: 0, y: 0, ease: "none", scrollTrigger: { trigger: ".modes", start: "top 60%", end: "top top", scrub: true } });
          });
        }

        const steps = gsap.utils.toArray<HTMLElement>(".step");
        const imgs = gsap.utils.toArray<HTMLElement>("#stack img");
        const capEl = document.getElementById("cap");
        const n = steps.length || 1;
        let active = 0;
        const lt = gsap.timeline({
          scrollTrigger: {
            trigger: "#lumiPin", start: "top top", end: "+=220%", scrub: 1, pin: true, anticipatePin: 1,
            onUpdate: (s) => {
              const k = Math.min(n - 1, Math.floor(s.progress * (n + 0.0001)));
              if (k !== active) {
                active = k;
                steps.forEach((st, i) => st.classList.toggle("on", i <= k));
                if (capEl) capEl.textContent = stepCaptions[k] ?? "";
              }
            },
          },
        });
        lt.to("#rail", { scaleY: 1, ease: "none", duration: n }, 0);
        imgs.slice(1).forEach((im, i) => {
          lt.fromTo(im, { clipPath: "inset(100% 0% 0% 0%)", scale: 1.2 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, ease: "power2.inOut", duration: 0.8 }, i + 0.6);
        });
      });
    });

    return () => {
      cleanupPills();
      tickers.forEach((f) => f());
      ctx.revert();
    };
  }, [stepCaptions]);
  return null;
}
