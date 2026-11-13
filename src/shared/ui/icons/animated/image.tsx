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
export const Image = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Image(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="image">
        <motion.rect
          {...{ width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1m3agn"
        />
        <motion.circle
          {...{ cx: "9", cy: "9", r: "2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="af1f0g"
        />
        <motion.path
          {...{ d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1xmnt7"
        />
      </AnimatedSvg>
    );
  },
);
