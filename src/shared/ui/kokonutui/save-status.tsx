"use client";

/**
 * @author: @kokonutui
 * @description: Save Status
 * @version: 1.0.0
 * @date: 2026-11-08
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

// Adapted as a controlled status indicator for the existing autosave engine.
import {
  CloudOff,
  CircleAlert,
  LoaderCircle,
  Check,
} from "@/shared/ui/icons/lucide";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import "./save-status.css";
import { cn } from "@/shared/lib/utils";

export interface SaveStatusProps {
  status: "saved" | "editing" | "saving" | "error";
  message?: string;
  className?: string;
}
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const subscribeOnline = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};
const onlineSnapshot = () => navigator.onLine;
const serverSnapshot = () => true;
export default function SaveStatus({
  status,
  message,
  className,
}: SaveStatusProps) {
  const online = useSyncExternalStore(
    subscribeOnline,
    onlineSnapshot,
    serverSnapshot,
  );
  const reduce = useReducedMotion();
  const state = !online && status !== "saved" ? "offline" : status;
  const label = {
    saved: "Salvo",
    editing: "Editando",
    saving: "Salvando",
    error: "Falha ao salvar",
    offline: "Sem conexão",
  }[state];
  const tone = {
    saved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    editing: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    saving: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    error: "bg-red-500/10 text-red-700 dark:text-red-300",
    offline: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  }[state];
  return (
    <motion.div
      data-save-state={state}
      layout={!reduce}
      title={message}
      role="status"
      aria-live="polite"
      className={cn(
        "kokonut-save-status inline-flex h-7 items-center overflow-hidden rounded-full px-2.5 text-[11px] font-medium",
        tone,
        className,
      )}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={state}
          className="flex items-center gap-1.5 whitespace-nowrap"
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -6 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT }}
        >
          {state === "saving" ? (
            <Spinner />
          ) : state === "saved" ? (
            <DrawnCheck />
          ) : state === "offline" ? (
            <CloudOff size={14} />
          ) : state === "error" ? (
            <CircleAlert size={14} />
          ) : (
            <span className="size-1.5 rounded-full bg-current opacity-70" />
          )}
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

function Spinner() {
  return (
    <LoaderCircle
      aria-hidden="true"
      className="size-3.5 animate-spin motion-reduce:animate-none"
    />
  );
}

function DrawnCheck() {
  return <Check aria-hidden="true" className="size-3.5 text-emerald-500" />;
}
