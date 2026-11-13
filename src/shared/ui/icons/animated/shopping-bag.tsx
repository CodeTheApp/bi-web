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
export const ShoppingBag = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function ShoppingBag(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="shopping-bag">
        <motion.path
          {...{ d: "M16 10a4 4 0 0 1-8 0" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1ltviw"
        />
        <motion.path
          {...{ d: "M3.103 6.034h17.794" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="awc11p"
        />
        <motion.path
          {...{
            d: "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="o988cm"
        />
      </AnimatedSvg>
    );
  },
);
