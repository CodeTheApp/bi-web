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
export const TicketPercent = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function TicketPercent(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="ticket-percent">
      <motion.path
        {...{
          d: "M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
        }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1l48ns"
      />
      <motion.path
        {...{ d: "M9 9h.01" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1q5me6"
      />
      <motion.path
        {...{ d: "m15 9-6 6" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="1uzhvr"
      />
      <motion.path
        {...{ d: "M15 15h.01" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="lqbp3k"
      />
    </AnimatedSvg>
  );
});
