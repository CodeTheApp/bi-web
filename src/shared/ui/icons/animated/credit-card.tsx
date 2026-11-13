"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/credit-card.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const CARD_VARIANTS: Variants = {
  normal: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 18,
    },
  },
  animate: {
    x: [0, -4, 1.5, 0],
    transition: {
      duration: 0.7,
      times: [0, 0.4, 0.75, 1],
      ease: "easeInOut",
    },
  },
};
export const CreditCard = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function CreditCard(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="credit-card">
        <motion.g animate={controls} initial="normal" variants={CARD_VARIANTS}>
          <rect height="14" rx="2" width="20" x="2" y="5" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </motion.g>
      </AnimatedSvg>
    );
  },
);
