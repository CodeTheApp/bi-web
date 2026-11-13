"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/moon.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import {
  motion,
  useAnimation,
  type Variants,
  type Transition,
} from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const SVG_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, -10, 10, -5, 5, 0],
  },
};
const SVG_TRANSITION: Transition = {
  duration: 1.2,
  ease: "easeInOut",
};
export const Moon = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Moon(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="moon">
        <motion.path
          d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
          animate={controls}
          variants={SVG_VARIANTS}
          transition={SVG_TRANSITION}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
