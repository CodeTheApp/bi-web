"use client";

/**
 * @author: @dorianbaffier
 * @description: Undo Button
 * @version: 1.0.0
 * @date: 2026-10-16
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Archive, Check, LoaderCircle, type LucideIcon, Undo2 } from "@/shared/ui/icons/lucide";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { DeferredAction } from "@/shared/lib/deferred-action";

export interface UndoButtonProps {
  label?: string; doneLabel?: string; icon?: LucideIcon; duration?: number;
  resetAfter?: number | null; disabled?: boolean; className?: string;
  onAction?: () => void; onCommit?: () => void | Promise<void>; onUndo?: () => void; onError?: (error: unknown) => void;
}
const pendingActions = new Set<DeferredAction>();
/** Adapted from Kokonut: controlled async commit, captured operation and safe unmount. */
export default function UndoButton({ label = "Arquivar", doneLabel = "Arquivado", icon: Icon = Archive, duration = 5000, resetAfter = 1800, disabled = false, onAction, onCommit, onUndo, onError, className }: UndoButtonProps) {
  const [phase, setPhase] = useState<"idle" | "pending" | "committing" | "done">("idle");
  const [seconds, setSeconds] = useState(Math.ceil(duration / 1000));
  const [width, setWidth] = useState<number>();
  const [progress, setProgress] = useState(1);
  const content = useRef<HTMLSpanElement>(null);
  const task = useRef<DeferredAction | null>(null);
  const hover = useRef(false);
  const mounted = useRef(true);
  const callbacks = useRef({ onCommit, onUndo, onError, onAction });
  const reduced = useReducedMotion();
  useLayoutEffect(() => { callbacks.current = { onCommit, onUndo, onError, onAction }; });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const pending = task.current;
      if (pending) pendingActions.delete(pending);
      if (pending?.status === "pending") void pending.commit().catch((error) => callbacks.current.onError?.(error));
    };
  }, []);
  useLayoutEffect(() => { if (!content.current) return; const node = content.current; const observer = new ResizeObserver(() => setWidth(node.offsetWidth + 2)); observer.observe(node); return () => observer.disconnect(); }, []);
  const undo = useCallback(() => { task.current?.cancel(); if (task.current) pendingActions.delete(task.current); setPhase("idle"); callbacks.current.onUndo?.(); }, []);
  useEffect(() => {
    if (phase !== "pending") return;
    const current = task.current;
    if (!current) return;
    pendingActions.add(current);
    let elapsed = 0; let last = performance.now(); let frame = 0;
    const tick = (now: number) => {
      if (!(hover.current && content.current?.getClientRects().length) && !document.hidden) elapsed += now - last;
      last = now;
      const remaining = Math.max(0, duration - elapsed);
      setSeconds(Math.ceil(remaining / 1000)); setProgress(remaining / duration);
      if (!remaining) {
        pendingActions.delete(current); setPhase("committing");
        void current.commit().then(() => { if (mounted.current) setPhase("done"); }).catch((error) => { if (mounted.current) setPhase("idle"); callbacks.current.onError?.(error); });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.defaultPrevented || editing || [...pendingActions].at(-1) !== current) return;
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); pendingActions.delete(current); window.removeEventListener("keydown", onKey); };
  }, [phase, duration, undo]);
  useEffect(() => { if (phase !== "done" || resetAfter === null) return; const timer = setTimeout(() => setPhase("idle"), resetAfter); return () => clearTimeout(timer); }, [phase, resetAfter]);
  const begin = () => {
    if (phase === "pending") { undo(); return; }
    if (phase !== "idle" || disabled) return;
    const operation = callbacks.current.onCommit;
    task.current = new DeferredAction(() => operation?.());
    setSeconds(Math.ceil(duration / 1000)); setProgress(1); setPhase("pending"); callbacks.current.onAction?.();
  };
  return <span className="relative inline-flex kokonut-undo">
    <motion.button type="button" className={cn("relative inline-flex h-9 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-zinc-200 bg-white text-xs text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100", className)} initial={false} animate={{ width: width ?? "auto" }} transition={{ duration: reduced ? 0 : .2, ease: [.23,1,.32,1] }} disabled={(disabled && phase === "idle") || phase === "committing" || phase === "done"} onClick={begin} onPointerEnter={(event) => { if (event.pointerType === "mouse") hover.current = true; }} onPointerLeave={() => { hover.current = false; }} aria-label={phase === "pending" ? `Desfazer ${label.toLocaleLowerCase("pt-BR")}. Restam ${seconds} segundos` : label}>
      <span ref={content} className="inline-flex px-3"><AnimatePresence initial={false} mode="popLayout"><motion.span key={phase} className="inline-flex items-center gap-2" initial={{ opacity: 0, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -5 }} transition={{ duration: .15 }}>
        {phase === "idle" && <><Icon size={14} />{label}</>}
        {phase === "pending" && <><Undo2 size={14} /><span>Desfazer</span><span className="tabular-nums">{seconds}s</span></>}
        {phase === "committing" && <><LoaderCircle size={14} className="animate-spin" />Aplicando…</>}
        {phase === "done" && <><Check size={14} />{doneLabel}</>}
      </motion.span></AnimatePresence></span>
    </motion.button>
    {phase === "pending" && <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true"><rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="17" fill="none" stroke="currentColor" strokeWidth="1.5" pathLength="1" strokeDasharray={`${progress} 1`} /></svg>}
    <span className="sr-only" role="status">{phase === "pending" ? `${label}: ação pendente. Você pode desfazer.` : phase === "done" ? doneLabel : ""}</span>
  </span>;
}
