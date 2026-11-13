"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/box.tsx
 * Canonical Lucide geometry: lucide-react (ISC); internal path drawing uses the official Box animation.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
// Path drawing adapted from the official BoxIcon PATH_VARIANTS.
const DRAW_VARIANTS: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    transition: { duration: 0.3, opacity: { duration: 0.1 } },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: { duration: 0.4, opacity: { duration: 0.1 } },
  },
};
export const FilePlus = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function FilePlus(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="file-plus">
        <motion.path
          {...{
            d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1oefj6"
        />
        <motion.path
          {...{ d: "M14 2v5a1 1 0 0 0 1 1h5" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="wfsgrz"
        />
        <motion.path
          {...{ d: "M9 15h6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="cctwl0"
        />
        <motion.path
          {...{ d: "M12 18v-6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="17g6i2"
        />
      </AnimatedSvg>
    );
  },
);
