"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/chevrons-up-down.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Transition } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};
export const ChevronsUpDown = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function ChevronsUpDown(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="chevrons-up-down"
    >
      <motion.path
        animate={controls}
        d="m7 15 5 5 5-5"
        initial="normal"
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: { translateY: "0%" },
          animate: { translateY: "2px" },
        }}
      />

      <motion.path
        animate={controls}
        d="m7 9 5-5 5 5"
        initial="normal"
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: { translateY: "0%" },
          animate: { translateY: "-2px" },
        }}
      />
    </AnimatedSvg>
  );
});
