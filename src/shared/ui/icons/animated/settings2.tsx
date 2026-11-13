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
export const Settings2 = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Settings2(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="settings2">
        <motion.path
          {...{ d: "M14 17H5" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="gfn3mx"
        />
        <motion.path
          {...{ d: "M19 7h-9" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="6i9tg"
        />
        <motion.circle
          {...{ cx: "17", cy: "17", r: "3" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="18b49y"
        />
        <motion.circle
          {...{ cx: "7", cy: "7", r: "3" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="dfmy0x"
        />
      </AnimatedSvg>
    );
  },
);
