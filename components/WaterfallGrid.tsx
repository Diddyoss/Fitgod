"use client";

import { motion } from "framer-motion";

/**
 * Masonry via CSS columns, with each child springing in on a stagger. The
 * `layout` prop is what makes filter changes reflow with physics rather than
 * snapping.
 */
export default function WaterfallGrid({ children }: { children: React.ReactNode[] }) {
  return (
    <div className="waterfall columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
      {children.map((child, i) => (
        <motion.div
          // eslint-disable-next-line react/no-array-index-key -- position is the identity here
          key={i}
          layout
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 22,
            delay: Math.min(i * 0.05, 0.6),
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
