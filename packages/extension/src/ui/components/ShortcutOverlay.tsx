import * as React from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { usePortalContainer } from "../lib/shadow";
import { useScrollLock } from "../lib/scrollLock";
import { IconButton } from "../primitives/IconButton";
import { Kbd } from "../primitives/Kbd";

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: "Global",
    items: [
      ["Toggle panel", "cmd shift e"],
      ["Command palette", "cmd k"],
      ["Close / cancel", "esc"],
    ],
  },
  {
    title: "Prompt",
    items: [
      ["Add to queue", "cmd enter"],
      ["Send queue", "cmd shift enter"],
    ],
  },
  {
    title: "Edits",
    items: [
      ["Undo", "cmd z"],
      ["Redo", "cmd shift z"],
      ["Nudge value", "up down"],
      ["Nudge ×10", "shift up"],
      ["Scrub-drag", "drag icon"],
    ],
  },
];

export interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const container = usePortalContainer();
  useScrollLock(open);
  if (!container) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className={cn(
              "w-[340px] max-h-[80vh] overflow-auto scroll-panel font-sans",
              "rounded-r-lg bg-surface-default text-text-default",
              "border border-border-default shadow-depth-4",
            )}
          >
            <header className="flex items-center justify-between h-10 px-s-400 border-b border-border-subtle">
              <span className="text-t-md font-semibold text-text-default">Keyboard shortcuts</span>
              <IconButton icon={<X size={12} />} label="Close" onClick={onClose} size="sm" />
            </header>
            <div className="px-s-400 py-s-300 flex flex-col gap-s-400">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <div className="text-[10px] text-text-tertiary mb-s-150 uppercase tracking-[0.08em] font-semibold leading-none">
                    {g.title}
                  </div>
                  <div className="flex flex-col gap-s-150">
                    {g.items.map(([label, keys]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between text-t-md text-text-default"
                      >
                        <span>{label}</span>
                        <Kbd keys={keys} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  );
}
