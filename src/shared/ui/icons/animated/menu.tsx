"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/menu.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const LINE_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    y: 0,
    opacity: 1,
  },
  animate: (custom: number) => ({
    rotate: custom === 1 ? 45 : custom === 3 ? -45 : 0,
    y: custom === 1 ? 6 : custom === 3 ? -6 : 0,
    opacity: custom === 2 ? 0 : 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  }),
};
export const Menu = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Menu(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="menu">
        <motion.line
          animate={controls}
          custom={1}
          initial="normal"
          variants={LINE_VARIANTS}
          x1="4"
          x2="20"
          y1="6"
          y2="6"
        />

        <motion.line
          animate={controls}
          custom={2}
          initial="normal"
          variants={LINE_VARIANTS}
          x1="4"
          x2="20"
          y1="12"
          y2="12"
        />

        <motion.line
          animate={controls}
          custom={3}
          initial="normal"
          variants={LINE_VARIANTS}
          x1="4"
          x2="20"
          y1="18"
          y2="18"
        />
      </AnimatedSvg>
    );
  },
);
