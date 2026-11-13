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
export const ChartNoAxesCombined = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function ChartNoAxesCombined(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="chart-no-axes-combined"
    >
      <motion.path
        {...{ d: "M12 16v5" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="zza2cw"
      />
      <motion.path
        {...{ d: "M16 14.639V21" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1s85h0"
      />
      <motion.path
        {...{ d: "M20 10.656V21" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="q45596"
      />
      <motion.path
        {...{
          d: "m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15",
        }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1fw8x9"
      />
      <motion.path
        {...{ d: "M4 18.463V21" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1otddq"
      />
      <motion.path
        {...{ d: "M8 14.656V21" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1t2idw"
      />
    </AnimatedSvg>
  );
});
