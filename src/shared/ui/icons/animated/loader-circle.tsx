"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/loader-circle.tsx
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
const G_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      repeat: 0,
      duration: 0.8,
      ease: "linear",
    },
  },
};
const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 50,
  damping: 10,
};
export const LoaderCircle = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function LoaderCircle(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="loader-circle">
      <motion.path
        animate={controls}
        d="M21 12a9 9 0 1 1-6.219-8.56"
        style={{ transformOrigin: "12px 12px" }}
        transition={DEFAULT_TRANSITION}
        variants={G_VARIANTS}
        initial="normal"
      />
    </AnimatedSvg>
  );
});
