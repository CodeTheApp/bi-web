"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/corner-right-down.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const STRETCH_VARIANTS: Variants = {
  normal: { scaleY: 1, y: 0, opacity: 1 },
  animate: {
    scaleY: [1, 1.15, 1],
    y: [0, 2, 0],
    transition: {
      duration: 0.45,
      ease: "easeInOut",
    },
  },
};
export const CornerRightDown = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function CornerRightDown(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="corner-right-down"
    >
      <motion.path
        d="m10 15 5 5 5-5"
        animate={controls}
        variants={STRETCH_VARIANTS}
        initial="normal"
      />

      <motion.path
        d="M4 4h7a4 4 0 0 1 4 4v12"
        animate={controls}
        variants={STRETCH_VARIANTS}
        initial="normal"
      />
    </AnimatedSvg>
  );
});
