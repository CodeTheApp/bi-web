"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/wallet.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const VARIANTS: Variants = {
  normal: {
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  animate: {
    y: [0, -3, 0],
    rotate: [0, -4, 0],
    transition: {
      duration: 0.55,
      ease: "easeInOut",
      times: [0, 0.45, 1],
    },
  },
};
export const Wallet = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Wallet(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="wallet">
        <motion.path
          d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
          animate={controls}
          variants={VARIANTS}
          initial="normal"
        />

        <motion.path
          d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"
          animate={controls}
          variants={VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
