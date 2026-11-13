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
export const CloudOff = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function CloudOff(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="cloud-off">
        <motion.path
          {...{
            d: "M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1uxyv8"
        />
        <motion.path
          {...{
            d: "M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="99tcn7"
        />
        <motion.path
          {...{ d: "m2 2 20 20" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1ooewy"
        />
      </AnimatedSvg>
    );
  },
);
