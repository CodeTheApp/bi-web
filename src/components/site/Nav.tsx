"use client";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  ["/#quem-somos", "Quem somos"],
  ["/#servicos", "Serviços"],
  ["/#luminotecnico", "Luminotécnico"],
  ["/#portfolio", "Portfólio"],
  ["/loja", "Loja"],
] as const;

/** Navegação: clara sobre seções claras, escura sobre [data-nav="dark"], some ao descer e volta ao subir. */
export function Nav({ instagram, whatsapp }: { instagram: string; whatsapp: string }) {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [hide, setHide] = useState(false);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    let lastY = 0;
    const update = () => {
      const y = window.scrollY;
      let onDark = false;
      document.querySelectorAll('[data-nav="dark"]').forEach((z) => {
        const r = z.getBoundingClientRect();
        if (r.top <= 40 && r.bottom > 40) onDark = true;
      });
      setLight(!onDark);
      if (!openRef.current && y > 600 && y > lastY + 4) setHide(true);
      if (y < lastY - 4 || y < 600) setHide(false);
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
    <header className={`nav${open ? " open" : ""}${light ? " light" : ""}${hide ? " hide" : ""}`} id="nav">
      <div className="wrap bar">
        <a className="logo" href="/#inicio" aria-label="Brasília Iluminação — início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="l-claro" src="/img/logo-claro.svg" alt="Brasília Iluminação" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="l-cor" src="/img/logo-cor.svg" alt="" aria-hidden="true" />
        </a>
        <ul>
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href}>{label}</a>
            </li>
          ))}
        </ul>
        <a className="btn cta" href="/#contato">
          Fale conosco <span className="ar">→</span>
        </a>
        <button className="burger" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <i />
          <i />
          <i />
        </button>
        <nav className="mmenu" aria-hidden={!open}>
          {LINKS.map(([href, label]) => (
            <a className="big" href={href} key={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <a className="big amber" href="/#contato" onClick={() => setOpen(false)}>
            Fale conosco
          </a>
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
