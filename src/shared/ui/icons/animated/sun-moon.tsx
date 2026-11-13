"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/sun-moon.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const SUN_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, -5, 5, -2, 2, 0],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
    },
  },
};
const MOON_VARIANTS: Variants = {
  normal: { opacity: 1 },
  animate: (i: number) => ({
    opacity: [0, 1],
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};
export const SunMoon = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function SunMoon(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="sun-moon">
        <motion.g animate={controls} initial="normal" variants={SUN_VARIANTS}>
          <path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4" />
        </motion.g>

        {[
          "M12 2v2",
          "M12 20v2",
          "m4.9 4.9 1.4 1.4",
          "m17.7 17.7 1.4 1.4",
          "M2 12h2",
          "M20 12h2",
          "m6.3 17.7-1.4 1.4",
          "m19.1 4.9-1.4 1.4",
        ].map((d, index) => (
          <motion.path
            animate={controls}
            custom={index + 1}
            d={d}
            initial="normal"
            key={d}
            variants={MOON_VARIANTS}
          />
        ))}
      </AnimatedSvg>
    );
  },
);
