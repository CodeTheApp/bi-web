"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/arrow-up.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PATH_VARIANTS: Variants = {
  normal: { d: "m5 12 7-7 7 7", translateY: 0 },
  animate: {
    d: "m5 12 7-7 7 7",
    translateY: [0, 3, 0],
    transition: {
      duration: 0.4,
    },
  },
};
const SECOND_PATH_VARIANTS: Variants = {
  normal: { d: "M12 19V5" },
  animate: {
    d: ["M12 19V5", "M12 19V10", "M12 19V5"],
    transition: {
      duration: 0.4,
    },
  },
};
export const ArrowUp = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function ArrowUp(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="arrow-up">
        <motion.path
          animate={controls}
          d="m5 12 7-7 7 7"
          variants={PATH_VARIANTS}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M12 19V5"
          variants={SECOND_PATH_VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
