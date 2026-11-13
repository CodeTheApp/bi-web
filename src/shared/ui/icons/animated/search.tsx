"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/search.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";

export const Search = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Search(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="search">
        <motion.circle
          cx="11"
          cy="11"
          r="8"
          animate={controls}
          variants={{
            normal: { x: 0, y: 0 },
            animate: {
              x: [0, 0, -3, 0],
              y: [0, -4, 0, 0],
            },
          }}
          transition={{
            duration: 1,
            bounce: 0.3,
          }}
          initial="normal"
        />

        <motion.path
          d="m21 21-4.3-4.3"
          animate={controls}
          variants={{
            normal: { x: 0, y: 0 },
            animate: {
              x: [0, 0, -3, 0],
              y: [0, -4, 0, 0],
            },
          }}
          transition={{
            duration: 1,
            bounce: 0.3,
          }}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
