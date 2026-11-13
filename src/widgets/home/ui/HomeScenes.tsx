"use client";
import { useEffect } from "react";
import { gsap, prefersReduced, split } from "@/shared/ui/motion/engine";

/** Cenas de rolagem da home, em tom contido: manifesto que acende, letreiro lento, cobogó que surge, luminotécnico fixado. */
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
        gsap.fromTo("#lightup .pill", { width: 0 }, { width: "2.4em", ease: "power2.out", duration: 1.2, stagger: 0.2, scrollTrigger: { trigger: lightup, start: "top 70%" } });
      }

      const row = document.querySelector<HTMLElement>(".marq .row");
      if (row) {
        let x = 0;
        const tick = () => {
          const half = row.scrollWidth / 2;
          x -= 0.45;
          if (x <= -half) x += half;
          row.style.transform = `translateX(${x}px)`;
        };
        gsap.ticker.add(tick);
        tickers.push(() => gsap.ticker.remove(tick));
      }

      const mm = gsap.matchMedia();
      mm.add("(min-width: 981px) and (min-height: 560px)", () => {
        const lumiPin = document.getElementById("lumiPin");
        if (!lumiPin) return;
        const steps = gsap.utils.toArray<HTMLElement>(".step");
        const imgs = gsap.utils.toArray<HTMLElement>("#stack img");
        const capEl = document.getElementById("cap");
        const n = steps.length || 1;
        let active = 0;
        const lt = gsap.timeline({
          scrollTrigger: {
            trigger: lumiPin, start: "top top", end: "+=220%", scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: (s) => {
              const k = Math.min(n - 1, Math.floor(s.progress * (n + 0.0001)));
              if (k !== active) {
                active = k;
                steps.forEach((st, i) => {
                  st.classList.toggle("on", i <= k);
                  st.classList.toggle("atual", i === k);
                });
                if (capEl) capEl.textContent = stepCaptions[k] ?? "";
              }
            },
          },
        });
        lt.to("#rail", { scaleY: 1, ease: "none", duration: n }, 0);
        imgs.slice(1).forEach((im, i) => {
          lt.fromTo(im, { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.5 }, i + 0.75);
        });
      });

      // Só giro no próprio eixo e opacidade: o desenho final mantém sua composição.
      // A medição vem depois do pin; o breakpoint recria a onda com as peças visíveis.
      mm.add({
        desktop: "(min-width: 981px) and (prefers-reduced-motion: no-preference)",
        compact: "(max-width: 980px) and (prefers-reduced-motion: no-preference)",
      }, () => {
        const wall = document.getElementById("wall");
        const section = wall?.closest(".wall-sec");
        const tiles = gsap.utils.toArray<HTMLElement>("#wall .c")
          .filter((tile) => tile.getClientRects().length);
        if (!wall || !section || !tiles.length) return;
        const heading = section.querySelector(".head") ?? section;
        const columns = getComputedStyle(wall).gridTemplateColumns.split(" ").length;
        const rows = Math.ceil(tiles.length / columns);

        gsap.set(tiles, {
          rotation: (i) => i % 2 ? 90 : -90,
          opacity: 0.15,
          transformOrigin: "50% 50%",
        });
        gsap.to(tiles, {
          rotation: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          stagger: { amount: 0.2, from: "center", grid: [rows, columns] },
          scrollTrigger: {
            trigger: wall,
            start: "top 95%",
            end: (self) => {
              const height = window.innerHeight;
              const originalEnd = Math.max(
                heading.getBoundingClientRect().top + window.scrollY - height * 0.12,
                self.start + height * 0.35,
              );
              // Amplia o percurso e termina enquanto o painel ainda está inteiro na tela.
              return Math.min(originalEnd + height * 0.35, self.start + height * 0.85);
            },
            scrub: true,
          },
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
