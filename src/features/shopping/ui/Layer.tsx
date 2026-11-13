"use client";
import { X } from "@/shared/ui/icons/lucide";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "@/shared/ui/motion/engine";

/** Trava a rolagem da página (inclusive a rolagem suave) enquanto uma camada está aberta. */
export function useScrollLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.classList.add("layer-open");
    motion.lenis?.stop();
    return () => {
      root.classList.remove("layer-open");
      motion.lenis?.start();
    };
  }, [on]);
}

/**
 * Camada sobre a página: gaveta à direita (sacola), janela central (entrar) ou folha de baixo (celular).
 * Fecha com Esc ou clicando fora, leva o foco para dentro e devolve ao sair.
 */
export function Layer({
  open,
  onClose,
  label,
  kind = "side",
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  kind?: "side" | "center";
  children: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("[autofocus], input, button:not([data-close]), a[href]");
      (first ?? panel.current)?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      back.current?.focus?.();
    };
  }, [open]);

  return (
    <div className={`layer ${kind}${open ? " open" : ""}`} aria-hidden={!open} inert={!open}>
      <div className="layer-back" onClick={onClose} />
      <div className={`layer-panel ${className}`} role="dialog" aria-modal="true" aria-label={label} ref={panel} tabIndex={-1} data-lenis-prevent>
        <button type="button" className="layer-x" onClick={onClose} aria-label="Fechar" data-close>
          <X size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
