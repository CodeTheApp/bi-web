"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/archive.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const RECT_VARIANTS: Variants = {
  normal: {
    translateY: 0,
    transition: {
      duration: 0.2,
      type: "spring",
      stiffness: 200,
      damping: 25,
    },
  },
  animate: {
    translateY: -1.5,
    transition: {
      duration: 0.2,
      type: "spring",
      stiffness: 200,
      damping: 25,
    },
  },
};
const PATH_VARIANTS: Variants = {
  normal: { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" },
  animate: { d: "M4 11v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11" },
};
const SECONDARY_PATH_VARIANTS: Variants = {
  normal: { d: "M10 12h4" },
  animate: { d: "M10 15h4" },
};
export const Archive = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Archive(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="archive">
        <motion.rect
          animate={controls}
          height="5"
          initial="normal"
          rx="1"
          variants={RECT_VARIANTS}
          width="20"
          x="2"
          y="3"
        />

        <motion.path
          animate={controls}
          d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"
          variants={PATH_VARIANTS}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M10 12h4"
          variants={SECONDARY_PATH_VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
