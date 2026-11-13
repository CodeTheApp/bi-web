"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/sliders-horizontal.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Transition } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 12,
  mass: 0.4,
};
export const SlidersHorizontal = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function SlidersHorizontal(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="sliders-horizontal"
    >
      <motion.line
        animate={controls}
        initial={false}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x2: 14,
          },
          animate: {
            x2: 10,
          },
        }}
        x1="21"
        x2="14"
        y1="4"
        y2="4"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x1: 10,
          },
          animate: {
            x1: 5,
          },
        }}
        x1="10"
        x2="3"
        y1="4"
        y2="4"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x2: 12,
          },
          animate: {
            x2: 18,
          },
        }}
        x1="21"
        x2="12"
        y1="12"
        y2="12"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x1: 8,
          },
          animate: {
            x1: 13,
          },
        }}
        x1="8"
        x2="3"
        y1="12"
        y2="12"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x2: 12,
          },
          animate: {
            x2: 4,
          },
        }}
        x1="3"
        x2="12"
        y1="20"
        y2="20"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x1: 16,
          },
          animate: {
            x1: 8,
          },
        }}
        x1="16"
        x2="21"
        y1="20"
        y2="20"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x1: 14,
            x2: 14,
          },
          animate: {
            x1: 9,
            x2: 9,
          },
        }}
        x1="14"
        x2="14"
        y1="2"
        y2="6"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x1: 8,
            x2: 8,
          },
          animate: {
            x1: 14,
            x2: 14,
          },
        }}
        x1="8"
        x2="8"
        y1="10"
        y2="14"
        initial="normal"
      />

      <motion.line
        animate={controls}
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: {
            x1: 16,
            x2: 16,
          },
          animate: {
            x1: 8,
            x2: 8,
          },
        }}
        x1="16"
        x2="16"
        y1="18"
        y2="22"
        initial="normal"
      />
    </AnimatedSvg>
  );
});
