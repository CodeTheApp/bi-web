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
export const PinOff = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function PinOff(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="pin-off">
        <motion.path
          {...{ d: "M12 17v5" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="bb1du9"
        />
        <motion.path
          {...{ d: "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="znwnzq"
        />
        <motion.path
          {...{ d: "m2 2 20 20" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1ooewy"
        />
        <motion.path
          {...{
            d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="c9qhm2"
        />
      </AnimatedSvg>
    );
  },
);
