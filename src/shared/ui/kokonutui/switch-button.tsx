"use client";
import { Sun, Moon } from "@/shared/ui/icons/lucide";

/**
 * @author: @dorianbaffier
 * @description: Switch Button
 * @version: 2.0.0
 * @date: 2026-10-16
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 *
 * Works on its own: it toggles the `dark` class on <html>. If a theme provider
 * owns the theme (next-themes or your own), pass `theme` and `onThemeChange`.
 *
 * The new theme spreads from the button as a circle (View Transitions API).
 * Without that API, or with reduced motion, the theme switches instantly.
 */

import { useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/shared/lib/utils";

type Theme = "light" | "dark";

interface SwitchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  /**
   * The applied theme, when a theme provider owns it (for next-themes, its
   * `resolvedTheme`). Pair it with `onThemeChange`. Without it the button
   * toggles the `dark` class on <html> itself.
   */
  theme?: Theme;
  /** Called with the theme to switch to. */
  onThemeChange?: (theme: Theme) => void;
  /** Spread the new theme from the button as a circle. */
  reveal?: boolean;
}

const SIZES = {
  sm: { button: "h-8 gap-1.5 px-2.5 text-[13px]", square: "w-8", icon: 14 },
  default: { button: "h-9 gap-2 px-3 text-sm", square: "w-9", icon: 16 },
  lg: { button: "h-10 gap-2 px-3.5 text-[15px]", square: "w-10", icon: 18 },
};

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_REVEAL = "cubic-bezier(0.4, 0, 0.2, 1)";
const REVEAL_ATTR = "data-theme-reveal";
const REVEAL_STYLE_ID = "kokonut-theme-reveal";
const REVEAL_CSS = `html[${REVEAL_ATTR}]::view-transition-old(root),html[${REVEAL_ATTR}]::view-transition-new(root){animation:none;mix-blend-mode:normal}`;

// Each part's light look is its base class and its dark look a `dark:` class,
// so the server render (theme unknown) matches the client. Clicking animates
// from the old computed values to the new ones with WAAPI, which keeps
// working when a provider disables CSS transitions while it swaps themes.
const ANIMATED_PROPS = ["opacity", "scale", "translate", "filter"] as const;

type Snapshot = Map<Element, Keyframe>;

function snapshot(elements: Element[]): Snapshot {
  const map: Snapshot = new Map();
  for (const el of elements) {
    const style = getComputedStyle(el);
    const frame: Keyframe = { offset: 0 };
    for (const prop of ANIMATED_PROPS) {
      frame[prop] = style.getPropertyValue(prop);
    }
    map.set(el, frame);
    for (const animation of el.getAnimations()) {
      animation.cancel();
    }
  }
  return map;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ensureRevealStyle() {
  if (document.getElementById(REVEAL_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = REVEAL_STYLE_ID;
  style.textContent = REVEAL_CSS;
  document.head.appendChild(style);
}

function timing(el: Element, toDark: boolean): KeyframeAnimationOptions {
  const part = (el as HTMLElement | SVGElement).dataset.part;
  return {
    duration: 240,
    delay: part === (toDark ? "moon" : "sun") ? 40 : 0,
    easing: EASE_OUT,
  };
}

function morph(from: Snapshot, toDark: boolean) {
  if (prefersReducedMotion()) {
    return;
  }
  for (const [el, frame] of from) {
    el.animate([frame, {}], { ...timing(el, toDark), fill: "backwards" });
  }
}

let revealRunning = false;

function revealFrom(button: HTMLElement, apply: () => void) {
  const doc = document as Document & { activeViewTransition?: unknown };
  if (
    typeof doc.startViewTransition !== "function" ||
    prefersReducedMotion() ||
    revealRunning ||
    doc.activeViewTransition
  ) {
    apply();
    return;
  }

  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const root = document.documentElement;

  ensureRevealStyle();
  root.setAttribute(REVEAL_ATTR, "");
  revealRunning = true;

  let transition: ViewTransition;
  try {
    transition = doc.startViewTransition(() => flushSync(apply));
  } catch {
    root.removeAttribute(REVEAL_ATTR);
    revealRunning = false;
    apply();
    return;
  }

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: EASE_REVEAL,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // Skipped or aborted (e.g. a page navigation started a transition).
    });

  transition.finished
    .catch(() => {
      // The theme is already applied by the time a transition can fail.
    })
    .finally(() => {
      root.removeAttribute(REVEAL_ATTR);
      revealRunning = false;
    });
}

const readTheme = (): Theme =>
  document.documentElement.dataset.adminTheme === "dark" ? "dark" : "light";
const serverTheme = (): Theme => "light";
const subscribeTheme = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-admin-theme"],
  });
  return () => observer.disconnect();
};

export default function SwitchButton({
  className,
  size = "default",
  showLabel = true,
  theme,
  onThemeChange,
  reveal = true,
  onClick,
  ...props
}: SwitchButtonProps) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const observed = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const current = theme ?? observed;
  const sizing = SIZES[size];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) {
      return;
    }
    const root = document.documentElement;
    const from = theme ?? readTheme();
    const next: Theme = from === "dark" ? "light" : "dark";
    const button = e.currentTarget;

    const apply = () => {
      const parts = [
        ...(iconRef.current?.querySelectorAll("[data-part]") ?? []),
        ...(labelRef.current?.querySelectorAll("[data-part]") ?? []),
      ];
      const before = snapshot(parts);
      // With a provider the class is also set here, because next-themes
      // applies it in an effect: the reveal's snapshot needs it now. The
      // provider then sets the same value.
      root.dataset.adminTheme = next;
      onThemeChange?.(next);
      morph(before, next === "dark");
    };

    if (reveal) {
      revealFrom(button, apply);
    } else {
      apply();
    }
  };

  return (
    <button
      aria-label="Tema escuro"
      aria-pressed={current ? current === "dark" : undefined}
      className={cn(
        "group/switch relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-lg font-medium",
        "border border-zinc-200 bg-white text-zinc-900 shadow-xs",
        "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
        "hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/70",
        "active:bg-zinc-100 dark:active:bg-zinc-800",
        "transition-[background-color,border-color] duration-150 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-950",
        "disabled:pointer-events-none disabled:opacity-50",
        sizing.button,
        !showLabel && cn(sizing.square, "px-0"),
        className,
      )}
      type="button"
      {...props}
      onClick={handleClick}
    >
      <span
        aria-hidden="true"
        ref={iconRef}
        className="pointer-events-none relative shrink-0"
        style={{ width: sizing.icon, height: sizing.icon }}
      >
        <Sun
          size={sizing.icon}
          data-part="sun"
          className="absolute inset-0 dark:scale-75 dark:opacity-0 dark:blur-[2px]"
        />
        <Moon
          size={sizing.icon}
          data-part="moon"
          className="absolute inset-0 scale-75 opacity-0 blur-[2px] dark:scale-100 dark:opacity-100 dark:blur-none"
        />
      </span>
      {showLabel && (
        <span aria-hidden="true" className="grid leading-none" ref={labelRef}>
          <span
            className="col-start-1 row-start-1 dark:opacity-0 dark:blur-[3px]"
            data-part="label"
          >
            Claro
          </span>
          <span
            className="col-start-1 row-start-1 opacity-0 blur-[3px] dark:opacity-100 dark:blur-none"
            data-part="label"
          >
            Escuro
          </span>
        </span>
      )}
    </button>
  );
}
