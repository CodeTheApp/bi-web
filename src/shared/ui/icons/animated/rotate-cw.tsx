"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/rotate-cw.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";

export const RotateCw = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function RotateCw(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="rotate-cw">
        <motion.path
          d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
          animate={controls}
          variants={{
            normal: { rotate: "0deg" },
            animate: { rotate: "50deg" },
          }}
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          initial="normal"
        />

        <motion.path
          d="M21 3v5h-5"
          animate={controls}
          variants={{
            normal: { rotate: "0deg" },
            animate: { rotate: "50deg" },
          }}
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
