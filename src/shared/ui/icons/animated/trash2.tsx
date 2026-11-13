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
export const Trash2 = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Trash2(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="trash2">
        <motion.path
          {...{ d: "M10 11v6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="nco0om"
        />
        <motion.path
          {...{ d: "M14 11v6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="outv1u"
        />
        <motion.path
          {...{ d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="miytrc"
        />
        <motion.path
          {...{ d: "M3 6h18" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="d0wm0j"
        />
        <motion.path
          {...{ d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="e791ji"
        />
      </AnimatedSvg>
    );
  },
);
