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
export const QrCode = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function QrCode(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="qr-code">
        <motion.rect
          {...{ width: "5", height: "5", x: "3", y: "3", rx: "1" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1tu5fj"
        />
        <motion.rect
          {...{ width: "5", height: "5", x: "16", y: "3", rx: "1" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1v8r4q"
        />
        <motion.rect
          {...{ width: "5", height: "5", x: "3", y: "16", rx: "1" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1x03jg"
        />
        <motion.path
          {...{ d: "M21 16h-3a2 2 0 0 0-2 2v3" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="177gqh"
        />
        <motion.path
          {...{ d: "M21 21v.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="ents32"
        />
        <motion.path
          {...{ d: "M12 7v3a2 2 0 0 1-2 2H7" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="8crl2c"
        />
        <motion.path
          {...{ d: "M3 12h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="nlz23k"
        />
        <motion.path
          {...{ d: "M12 3h.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="n36tog"
        />
        <motion.path
          {...{ d: "M12 16v.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="133mhm"
        />
        <motion.path
          {...{ d: "M16 12h1" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1slzba"
        />
        <motion.path
          {...{ d: "M21 12v.01" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1lwtk9"
        />
        <motion.path
          {...{ d: "M12 21v-1" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1880an"
        />
      </AnimatedSvg>
    );
  },
);
