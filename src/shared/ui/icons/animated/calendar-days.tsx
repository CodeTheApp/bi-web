"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/calendar-days.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import {
  motion,
  useAnimation,
  type Variants,
  AnimatePresence,
} from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const DOTS = [
  { cx: 8, cy: 14 },
  { cx: 12, cy: 14 },
  { cx: 16, cy: 14 },
  { cx: 8, cy: 18 },
  { cx: 12, cy: 18 },
  { cx: 16, cy: 18 },
];
const VARIANTS: Variants = {
  normal: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  animate: (i: number) => ({
    opacity: [1, 0.3, 1],
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      times: [0, 0.5, 1],
    },
  }),
};
export const CalendarDays = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function CalendarDays(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="calendar-days">
      <path d="M8 2v4" />

      <path d="M16 2v4" />

      <rect height="18" rx="2" width="18" x="3" y="4" />

      <path d="M3 10h18" />

      <AnimatePresence>
        {DOTS.map((dot, index) => (
          <motion.circle
            animate={controls}
            custom={index}
            cx={dot.cx}
            cy={dot.cy}
            fill="currentColor"
            initial="normal"
            key={`${dot.cx}-${dot.cy}`}
            r="1"
            stroke="none"
            variants={VARIANTS}
          />
        ))}
      </AnimatePresence>
    </AnimatedSvg>
  );
});
