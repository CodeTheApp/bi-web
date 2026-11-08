"use client";
import { useEffect, useRef } from "react";
import type { Section } from "@/lib/content/schema";
import { gsap, motion, onReady, prefersReduced } from "../motion/engine";
import type { CobogoStage } from "./hero3d";

type Props = {
  variant: "cobogo" | "janela";
  section: Section;
  credit: { title: string; href: string } | null;
};

/** "Projeto e curadoria de iluminação, do seu jeito." → o trecho final em itálico âmbar. */
function Sub({ text }: { text: string }) {
  const i = text.lastIndexOf(", ");
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i + 2)}
      <i>{text.slice(i + 2)}</i>
    </>
  );
}

export function Hero({ variant, section, credit }: Props) {
  const secRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const photo = section.image || "/img/hero.jpg";

  useEffect(() => {
    const sec = secRef.current!;
    const pin = pinRef.current!;
    if (prefersReduced()) return;

    let three: CobogoStage | null = null;
    let alive = true;
    let introDone = false;
    const setNavDark = (on: boolean) => {
      if (on) sec.setAttribute("data-nav", "dark");
      else sec.removeAttribute("data-nav");
      window.dispatchEvent(new Event("bi:nav"));
    };

    if (variant === "cobogo") {
      import("./hero3d")
        .then((m) => {
          if (!alive) return;
          try {
            three = m.cobogo(pin.querySelector<HTMLElement>(".h3d")!, photo);
            if (introDone) three.intro();
          } catch (err) {
            console.warn("3D indisponível", err);
          }
        })
        .catch((err) => console.warn("three.js não carregou", err));
    }

    const ctx = gsap.context(() => {
      if (variant === "cobogo") {
        const gut = () => parseFloat(getComputedStyle(document.querySelector(".wrap")!).paddingLeft) || 40;
        gsap
          .timeline({
            scrollTrigger: {
              trigger: sec, start: "top top", end: "+=200%", scrub: 1, pin: true, pinSpacing: true, anticipatePin: 1, refreshPriority: 10, invalidateOnRefresh: true,
              onUpdate: (s) => {
                if (three) three.progress = s.progress;
                setNavDark(s.progress < 0.8);
              },
            },
          })
          .to(".bottom, .hero-top", { autoAlpha: 0, duration: 0.08 }, 0)
          .to(".ln>span", { yPercent: -112, stagger: 0.04, duration: 0.16, ease: "power2.in" }, 0.34)
          .to(".copy .label, .copy p, .acts", { y: -30, autoAlpha: 0, stagger: 0.03, duration: 0.14, ease: "power2.in" }, 0.34)
          .to(".photo", { opacity: 1, duration: 0.08, ease: "none" }, 0.4)
          .to(".fade", { opacity: 0, duration: 0.2, ease: "none" }, 0.46)
          .to(".h3d", { clipPath: () => `inset(9% ${gut()}px 9% ${gut()}px round 28px)`, duration: 0.16, ease: "power2.inOut" }, 0.74)
          .to(sec, { backgroundColor: "#FFF8F5", duration: 0.14, ease: "none" }, 0.76)
          .fromTo(".credit", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.08 }, 0.88)
          .to({}, { duration: 0.04 });
      } else {
        const lux = { v: 0 };
        const luxv = pin.querySelector(".luxv");
        gsap
          .timeline({ scrollTrigger: { trigger: sec, start: "top top", end: "+=130%", scrub: 1, pin: true, pinSpacing: true, anticipatePin: 1, refreshPriority: 10 } })
          .to(".hero-media", { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none" }, 0)
          .to(".hero-media img", { scale: 1, filter: "brightness(.9) saturate(1.05)", ease: "none" }, 0)
          .to(".hero-title", { scale: 0.82, yPercent: -18, autoAlpha: 0, ease: "power1.in" }, 0.15)
          .to(lux, { v: 300, ease: "none", onUpdate: () => void (luxv && (luxv.textContent = String(Math.round(lux.v)))) }, 0)
          .to(".luxbar", { scaleX: 1, ease: "none" }, 0)
          .to(".hero-bottom p, .hero-top", { autoAlpha: 0, y: -20 }, 0.6);
      }
    }, pin);

    const hm = pin.querySelector<HTMLElement>(".hero-media");
    const onMove = (e: MouseEvent) => {
      hm?.style.setProperty("--mx", `${e.clientX}px`);
      hm?.style.setProperty("--my", `${e.clientY}px`);
    };
    if (hm) pin.addEventListener("mousemove", onMove);

    const offReady = onReady(() => {
      introDone = true;
      ctx.add(() => {
        const tl = gsap.timeline();
        if (variant === "cobogo") {
          tl.fromTo(".ln>span", { yPercent: 115 }, { yPercent: 0, duration: 1.5, ease: "expo.out", stagger: 0.12 }, 0.9)
            .fromTo(".label, .copy p, .acts, .bottom>*, .hero-top>*", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.07 }, 1.2)
            .fromTo(".fade", { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power2.out" }, 0.4);
        } else {
          tl.fromTo(".ln>span", { yPercent: 115 }, { yPercent: 0, duration: 1.5, ease: "expo.out", stagger: 0.12 }, 0)
            .fromTo(".hero-media", { clipPath: "inset(50% 50% 50% 50% round 28px)" }, { clipPath: "inset(13% 24% 13% 24% round 28px)", duration: 1.6, ease: "expo.inOut" }, 0)
            .fromTo(".hero-top>*, .hero-bottom>*", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.08 }, 0.7);
        }
      });
      three?.intro();
    });

    return () => {
      alive = false;
      offReady();
      pin.removeEventListener("mousemove", onMove);
      ctx.revert();
      three?.destroy();
      if (motion.lenis) motion.lenis.resize();
    };
  }, [variant, photo]);

  const top = (
    <div className="wrap hero-top">
      <span>{section.label}</span>
      <span>Brasília — DF · desde 2021</span>
    </div>
  );
  const title = (
    <>
      <span className="ln">
        <span>{section.title}</span>
      </span>
      {section.title2 && (
        <span className="ln amber">
          <span>{section.title2}</span>
        </span>
      )}
    </>
  );
  const cta = (
    <a className="btn" href="#quem-somos">
      {section.cta || "Saiba mais"} <span className="ar">↓</span>
    </a>
  );

  return (
    <section className="hero dark" id="inicio" data-nav="dark" ref={secRef}>
      <div className={`hero-pin v-${variant}`} ref={pinRef}>
        {variant === "cobogo" ? (
          <>
            <div className="h3d">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="photo" src={photo} alt={credit ? credit.title : "Projeto de iluminação"} fetchPriority="high" />
            </div>
            <div className="fade" />
            {top}
            <div className="wrap copy">
              <span className="label">{section.label}</span>
              <h1 className="display">{title}</h1>
              <p>
                <Sub text={section.text} />
              </p>
              <div className="acts">
                {cta}
                <a className="ulink" href="#portfolio">
                  Ver projetos <span className="ar">→</span>
                </a>
              </div>
            </div>
            <div className="wrap bottom">
              <span className="hint">Passe o cursor para acender as peças</span>
              <span className="scroll">
                Role
                <i />
              </span>
            </div>
            {credit && (
              <div className="credit">
                <div>
                  <span className="label">Por trás das peças</span>
                  <span className="t">{credit.title}</span>
                </div>
                <a className="ulink" href={credit.href}>
                  Ver projeto <span className="ar">→</span>
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="hero-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={credit ? credit.title : "Projeto de iluminação"} fetchPriority="high" />
              <div className="hero-glow" />
            </div>
            <div className="hero-shade" />
            {top}
            <h1 className="hero-title h-xl">{title}</h1>
            <div className="wrap hero-bottom">
              <p>
                <Sub text={section.text} />
              </p>
              {cta}
              <div className="lux" aria-hidden="true">
                <b>
                  <span className="luxv">0</span> lx
                </b>
                Role para acender
                <span className="bar">
                  <i className="luxbar" />
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
