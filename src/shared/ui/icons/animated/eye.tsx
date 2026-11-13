"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/eye.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";

export const Eye = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Eye(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="eye">
        <motion.path
          animate={controls}
          d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
          style={{ originY: "50%" }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          variants={{
            normal: { scaleY: 1, opacity: 1 },
            animate: { scaleY: [1, 0.1, 1], opacity: [1, 0.3, 1] },
          }}
          initial="normal"
        />

        <motion.circle
          animate={controls}
          cx="12"
          cy="12"
          r="3"
          transition={{ duration: 0.4, ease: "easeInOut" }}
          variants={{
            normal: { scale: 1, opacity: 1 },
            animate: { scale: [1, 0.3, 1], opacity: [1, 0.3, 1] },
          }}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
