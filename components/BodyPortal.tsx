"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body instead of in place.
 *
 * app/template.tsx wraps every page in a motion.div that animates `y` on
 * route change. Framer Motion applies that as a CSS transform, and ANY
 * non-`none` transform on an ancestor creates a new containing block for
 * `position: fixed` descendants (this is in the CSS spec, not a Framer bug) —
 * so a `fixed` element rendered from inside a page's own JSX ends up fixed to
 * that small animated wrapper instead of the viewport, landing wherever the
 * wrapper happens to sit rather than the screen edge.
 *
 * Escaping to document.body sidesteps the whole containing-block chain.
 * Anything meant to be fixed relative to the viewport — sheets, full-screen
 * overlays, floating action buttons — should render through this rather than
 * directly in a page.
 */
export default function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
