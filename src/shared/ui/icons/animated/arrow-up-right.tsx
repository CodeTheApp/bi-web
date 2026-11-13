"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/arrow-up-right.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const ARROW_VARIANTS: Variants = {
  normal: {
    scale: 1,
    translateX: 0,
    translateY: 0,
  },
  animate: {
    scale: [1, 0.85, 1],
    translateX: [0, -4, 0],
    translateY: [0, 4, 0],
    originX: 1,
    originY: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};
export const ArrowUpRight = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function ArrowUpRight(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="arrow-up-right">
      <motion.g animate={controls} variants={ARROW_VARIANTS} initial="normal">
        <path d="M7 7H17" />
        <path d="M17 7V17" />
        <path d="M7 17L17 7" />
      </motion.g>
    </AnimatedSvg>
  );
});
