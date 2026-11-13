"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/grip-vertical.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const CIRCLES = [
  { cx: 9, cy: 5 },
  { cx: 9, cy: 12 },
  { cx: 9, cy: 19 },
  { cx: 15, cy: 5 },
  { cx: 15, cy: 12 },
  { cx: 15, cy: 19 },
];
const ROWS = 3;
const VARIANTS: Variants = {
  normal: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  animate: (data: { index: number }) => {
    const row = data.index % ROWS;
    const col = Math.floor(data.index / ROWS);
    const delay = row * 0.15 + col * (ROWS * 0.15 - 0.2);

    return {
      opacity: [1, 0.4, 1],
      scale: [1, 0.85, 1],
      transition: { delay, duration: 1, ease: "easeInOut" },
    };
  },
};
export const GripVertical = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function GripVertical(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="grip-vertical">
      {CIRCLES.map((circle, index) => (
        <motion.circle
          animate={controls}
          custom={{ index }}
          cx={circle.cx}
          cy={circle.cy}
          initial="normal"
          key={`${circle.cx}-${circle.cy}`}
          r="1"
          variants={VARIANTS}
        />
      ))}
    </AnimatedSvg>
  );
});
