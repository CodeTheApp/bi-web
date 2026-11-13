"use client";
import "./nav-brand.css";
import "@/styles/public-icons.css";
import { ArrowRight, Menu, X } from "@/shared/ui/icons/lucide";

import { useEffect, useRef, useState } from "react";
import { MobileShopLinks, NavShop } from "@/features/shopping";
import { brandOf, companyOf, type Settings } from "@/entities/site-content";

const LINKS = [
  ["/#quem-somos", "Quem somos"],
  ["/#servicos", "Serviços"],
  ["/#luminotecnico", "Luminotécnico"],
  ["/#portfolio", "Portfólio"],
  ["/loja", "Loja"],
] as const;

/** Transparente no topo; após rolar, usa uma superfície própria e volta ao subir. */
export function Nav({ settings }: { settings: Settings }) {
  const { instagram, whatsapp } = settings;
  const brand = brandOf(settings);
  const company = companyOf(settings);
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hide, setHide] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    let lastY = window.scrollY;
    let direction = 0;
    let distance = 0;
    const update = () => {
      const y = Math.max(0, window.scrollY);
      const hasSurface = y > 64;
      let onDark = false;
      if (!hasSurface) {
        document.querySelectorAll('[data-nav="dark"]').forEach((z) => {
          const r = z.getBoundingClientRect();
          if (r.top <= 40 && r.bottom > 40) onDark = true;
        });
      }
      setScrolled(hasSurface);
      setLight(hasSurface || !onDark);

      const delta = y - lastY;
      if (delta !== 0) {
        const nextDirection = Math.sign(delta);
        distance =
          nextDirection === direction
            ? distance + Math.abs(delta)
            : Math.abs(delta);
        direction = nextDirection;
      }
      const focused = document.activeElement;
      const hasKeyboardFocus =
        navRef.current?.contains(focused) && focused?.matches(":focus-visible");
      if (openRef.current || hasKeyboardFocus || y < 600) {
        setHide(false);
        distance = 0;
      } else if (distance >= 24) {
        setHide(direction > 0);
        distance = 0;
      }
      lastY = y;
    };
    const close = () => setOpen(false);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("bi:nav", update);
    window.addEventListener("bi:closemenu", close);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("bi:nav", update);
      window.removeEventListener("bi:closemenu", close);
    };
  }, []);

  return (
    <header
      ref={navRef}
      onFocusCapture={() => setHide(false)}
      className={`nav${open ? " open" : ""}${light ? " light" : ""}${scrolled ? " scrolled" : ""}${hide ? " hide" : ""}`}
      id="nav"
    >
      <div className="wrap bar">
        <a
          className="logo"
          href="/#inicio"
          aria-label={`${company.commercialName} — início`}
        >
          <picture>
            <source media="(max-width: 600px)" srcSet={brand.compactLight} />
            <img
              className="l-claro nav-brand-image"
              src={brand.logoLight}
              alt={company.commercialName}
            />
          </picture>
          <picture>
            <source media="(max-width: 600px)" srcSet={brand.compactDark} />
            <img
              className="l-cor nav-brand-image"
              src={brand.logoDark}
              alt=""
              aria-hidden="true"
            />
          </picture>
        </a>
        <ul>
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
        <div className="nav-end">
          <NavShop />
          <a className="btn cta" href="/#contato">
            Fale conosco{" "}
            <ArrowRight
              className="ar"
              size={18}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </a>
          <button
            className="burger"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
        <nav className="mmenu" aria-hidden={!open}>
          {LINKS.map(([href, label]) => (
            <a
              className="big"
              href={href}
              key={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
          <a
            className="big amber"
            href="/#contato"
            onClick={() => setOpen(false)}
          >
            Fale conosco
          </a>
          <MobileShopLinks onNavigate={() => setOpen(false)} />
          <div className="meta">
            <span>
              {instagram}
              <br />
              {whatsapp}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/feixe.svg" alt="" width={26} />
          </div>
        </nav>
      </div>
    </header>
  );
}
