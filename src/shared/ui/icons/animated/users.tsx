"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/users.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PATH_VARIANTS: Variants = {
  normal: {
    translateX: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 13,
    },
  },
  animate: {
    translateX: [-6, 0],
    transition: {
      delay: 0.1,
      type: "spring",
      stiffness: 200,
      damping: 13,
    },
  },
};
export const Users = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Users(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="users">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />

        <circle cx="9" cy="7" r="4" />

        <motion.path
          animate={controls}
          d="M22 21v-2a4 4 0 0 0-3-3.87"
          variants={PATH_VARIANTS}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M16 3.13a4 4 0 0 1 0 7.75"
          variants={PATH_VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
