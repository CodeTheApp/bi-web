"use client";

/**
 * @author: @kokonutui
 * @description: Inline Alert
 * @version: 1.0.0
 * @date: 2026-11-08
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
} from "@/shared/ui/icons/lucide";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
export interface AlertCheck {
  name: string;
  detail?: string;
  ok: boolean;
}
export interface InlineAlertProps {
  checks: AlertCheck[];
  target?: string;
  className?: string;
}
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Checks are derived from the actual form; the component never simulates a passing retry. */
export default function InlineAlert({
  checks,
  target = "Publicação",
  className,
}: InlineAlertProps) {
  const [open, setOpen] = useState(false);
  const failed = checks.filter((check) => !check.ok);
  const Icon = failed.length ? CircleAlert : CircleCheck;
  return (
    <MotionConfig reducedMotion="user">
      <section
        className={cn(
          "rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
          className,
        )}
        aria-label="Revisão do produto"
      >
        <button
          type="button"
          className="flex w-full items-center gap-2.5 text-left"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <Icon
            size={17}
            className={failed.length ? "text-amber-600" : "text-emerald-600"}
          />
          <span className="flex-1">
            <span className="block text-xs font-medium">
              {failed.length
                ? `${failed.length} ${failed.length === 1 ? "ponto para revisar" : "pontos para revisar"}`
                : "Pronto para publicar"}
            </span>
            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
              {target} · {checks.length - failed.length} de {checks.length}{" "}
              verificações
            </span>
          </span>
          <ChevronDown
            size={15}
            style={{
              transform: open ? "rotate(180deg)" : undefined,
              transition: "transform .2s",
            }}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ul className="mt-2 border-t border-zinc-200 pt-1 dark:border-zinc-700">
                {checks.map((check) => (
                  <CheckRow key={check.name} check={check} running={false} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}
function CheckRow({ check, running }: { check: AlertCheck; running: boolean }) {
  let status = "Failed";
  if (running) {
    status = "Running";
  } else if (check.ok) {
    status = "Passed";
  }
  return (
    <li className="flex items-start gap-2.5 pt-2.5 first:pt-3">
      <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            className="flex"
            exit={{ opacity: 0, scale: 0.8, filter: "blur(2px)" }}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(2px)" }}
            key={
              status === "Passed"
                ? "Pronto"
                : status === "Running"
                  ? "Verificando"
                  : "Revisar"
            }
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <CheckGlyph status={status} />
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="min-w-0 flex-1 text-[13px]">
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">{check.name}</span>
          <span className="relative text-[12px] text-zinc-500 dark:text-zinc-400">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                className="block"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key={
                  status === "Passed"
                    ? "Pronto"
                    : status === "Running"
                      ? "Verificando"
                      : "Revisar"
                }
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                {status === "Passed"
                  ? "Pronto"
                  : status === "Running"
                    ? "Verificando"
                    : "Revisar"}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <AnimatePresence initial={false}>
          {check.detail && (
            <motion.span
              animate={{ height: "auto", opacity: 1 }}
              className="block overflow-hidden"
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: { duration: 0.25, ease: EASE_OUT },
                  opacity: { duration: 0.12 },
                },
              }}
              initial={{ height: 0, opacity: 0 }}
            >
              <span
                className={cn(
                  "block font-mono text-[11.5px] text-zinc-600 transition-opacity duration-200 dark:text-zinc-400",
                  running && "opacity-50",
                )}
              >
                {check.detail}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </li>
  );
}

function CheckGlyph({ status }: { status: string }) {
  if (status === "Running") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className="size-4 animate-spin text-sky-500"
      />
    );
  }
  if (status === "Passed") {
    return (
      <CircleCheck aria-hidden="true" className="size-4 text-emerald-500" />
    );
  }
  return <CircleAlert aria-hidden="true" className="size-4 text-rose-500" />;
}
