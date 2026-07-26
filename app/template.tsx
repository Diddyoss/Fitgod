"use client";

import { motion, MotionConfig } from "framer-motion";

/**
 * App Router re-mounts template.tsx on every navigation, which is what makes
 * the enter animation fire per-route (layout.tsx would not).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
