"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/send.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";

export const Send = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Send(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="send">
        <motion.g
          animate={controls}
          transition={{ duration: 0.5 }}
          variants={{
            normal: { x: 0, y: 0, scale: 1 },
            animate: {
              x: 3,
              y: -3,
              scale: 0.8,
            },
          }}
          initial="normal"
        >
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
          <path d="m21.854 2.147-10.94 10.939" />
        </motion.g>

        <motion.path
          animate={controls}
          d="M -3 28 C -0.5 26.8 1.6 24.6 3.3 22 C 4.8 19.7 5.2 17.6 4.2 16.1 C 3.2 14.7 1.4 14.5 0.3 15.8 C -0.9 17.2 -0.6 19.4 1.2 20.4 C 3.4 21.5 6.4 19.4 9 15.8"
          fill="none"
          initial={{ opacity: 0, pathLength: 0 }}
          stroke="currentColor"
          strokeDasharray="2 2"
          strokeWidth="1"
          transition={{ duration: 0.55, delay: 0.1 }}
          variants={{
            normal: {
              pathLength: 0,
              opacity: 0,
              translateX: -3,
              translateY: 3,
              transition: { duration: 0.3 },
            },
            animate: {
              pathLength: 1,
              opacity: 1,
              translateX: 0,
              translateY: 0,
            },
          }}
        />
      </AnimatedSvg>
    );
  },
);
