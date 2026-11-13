"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/plus.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";

export const Plus = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Plus(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="plus">
        <motion.path
          d="M5 12h14"
          animate={controls}
          variants={{
            normal: {
              rotate: 0,
            },
            animate: {
              rotate: 180,
            },
          }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          initial="normal"
        />

        <motion.path
          d="M12 5v14"
          animate={controls}
          variants={{
            normal: {
              rotate: 0,
            },
            animate: {
              rotate: 180,
            },
          }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
