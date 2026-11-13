"use client";
/**
 * Lucide Animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/bell.tsx
 * SVG-only adapter; preserves the official bell geometry and finite swing variants.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const BELL_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: [0, -10, 10, -10, 0] },
};
export const Bell = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Bell(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="bell">
        <motion.g
          animate={controls}
          initial="normal"
          variants={BELL_VARIANTS}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ transformOrigin: "12px 2px" }}
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </motion.g>
      </AnimatedSvg>
    );
  },
);
