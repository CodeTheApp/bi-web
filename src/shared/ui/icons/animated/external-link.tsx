"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/external-link.tsx
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
    scale: [1, 0.92, 1],
    translateX: [0, 2, 0],
    translateY: [0, -2, 0],
    originX: 1,
    originY: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};
export const ExternalLink = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function ExternalLink(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="external-link">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />

      <motion.g animate={controls} variants={ARROW_VARIANTS} initial="normal">
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
      </motion.g>
    </AnimatedSvg>
  );
});
