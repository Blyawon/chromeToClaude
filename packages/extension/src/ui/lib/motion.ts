import type { Transition, Variants } from "framer-motion";

// Unified spring used across the UI.
export const spring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 36,
  mass: 0.9,
};

export const springFast: Transition = {
  type: "spring",
  stiffness: 720,
  damping: 38,
  mass: 0.75,
};

// Hover / press scales used on all interactive surfaces.
export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.96 },
  transition: springFast,
};

export const pressableSm = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.92 },
  transition: springFast,
};

export const fadeSlide: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: 2, transition: { duration: 0.12 } },
};

export const popoverMotion: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springFast },
  exit: { opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.1 } },
};

// Note: no x/y here — panel position is owned by motion values in App.tsx.
// Only opacity + scale animate on enter/exit.
export const panelMotion: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 360, damping: 38 },
  },
  exit: { opacity: 0, scale: 0.99, transition: { duration: 0.14 } },
};
