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
export const Package = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Package(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="package">
        <motion.path
          {...{
            d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1a0edw"
        />
        <motion.path
          {...{ d: "M12 22V12" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="d0xqtd"
        />
        <motion.polyline
          {...{ points: "3.29 7 12 12 20.71 7" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="ousv84"
        />
        <motion.path
          {...{ d: "m7.5 4.27 9 5.15" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1c824w"
        />
      </AnimatedSvg>
    );
  },
);
