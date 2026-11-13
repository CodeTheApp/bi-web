"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/grip-horizontal.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const CIRCLES = [
  { cx: 5, cy: 9 },
  { cx: 12, cy: 9 },
  { cx: 19, cy: 9 },
  { cx: 5, cy: 15 },
  { cx: 12, cy: 15 },
  { cx: 19, cy: 15 },
];
const VARIANTS: Variants = {
  normal: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  animate: (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;

    const delay = col * 0.15 + row * 0.25;

    return {
      opacity: [1, 0.4, 1],
      scale: [1, 0.85, 1],
      transition: {
        delay,
        duration: 1,
        ease: "easeInOut",
      },
    };
  },
};
export const GripHorizontal = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function GripHorizontal(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="grip-horizontal"
    >
      {CIRCLES.map((circle, index) => (
        <motion.circle
          animate={controls}
          custom={index}
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
