"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/user-plus.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PLUS_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  animate: {
    scale: [0, 1.15, 1],
    rotate: [-90, 0, 0],
    opacity: [0, 1, 1],
    transition: {
      delay: 0.25,
      duration: 0.45,
      ease: "easeOut",
      times: [0, 0.7, 1],
    },
  },
};
export const UserPlus = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function UserPlus(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="user-plus">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />

        <circle cx="9" cy="7" r="4" />

        <motion.g
          animate={controls}
          initial="normal"
          style={{ transformOrigin: "19px 11px" }}
          variants={PLUS_VARIANTS}
        >
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </motion.g>
      </AnimatedSvg>
    );
  },
);
