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
export const Keyboard = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Keyboard(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="keyboard">
        <motion.path
          {...{ d: "M10 8h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1r9ogq"
        />
        <motion.path
          {...{ d: "M12 12h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1mp3jc"
        />
        <motion.path
          {...{ d: "M14 8h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1primd"
        />
        <motion.path
          {...{ d: "M16 12h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1l6xoz"
        />
        <motion.path
          {...{ d: "M18 8h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="emo2bl"
        />
        <motion.path
          {...{ d: "M6 8h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="x9i8wu"
        />
        <motion.path
          {...{ d: "M7 16h10" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="wp8him"
        />
        <motion.path
          {...{ d: "M8 12h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="czm47f"
        />
        <motion.rect
          {...{ width: "20", height: "16", x: "2", y: "4", rx: "2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="18n3k1"
        />
      </AnimatedSvg>
    );
  },
);
