"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/undo.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, cubicBezier } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const CUSTOM_EASING = cubicBezier(0.25, 0.1, 0.25, 1);
export const Undo2 = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Undo2(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="undo2">
        <motion.path
          animate={controls}
          d="M3 7v6h6"
          transition={{
            duration: 0.6,
            ease: CUSTOM_EASING,
          }}
          variants={{
            normal: { translateX: 0, translateY: 0, rotate: 0 },
            animate: {
              translateX: [0, 2.1, 0],
              translateY: [0, -1.4, 0],
              rotate: [0, 12, 0],
            },
          }}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
          transition={{
            duration: 0.6,
            ease: CUSTOM_EASING,
          }}
          variants={{
            normal: { pathLength: 1 },
            animate: { pathLength: [1, 0.8, 1] },
          }}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
