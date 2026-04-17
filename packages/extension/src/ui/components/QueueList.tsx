import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Trash2, X } from "lucide-react";
import { cn } from "../lib/utils";
import { IconButton } from "../primitives/IconButton";
import { Button } from "../ui/button";
import { springFast } from "../lib/motion";
import { Kbd } from "../primitives/Kbd";
import type { QueueItem } from "../state";

export interface QueueListProps {
  queue: QueueItem[];
  sending: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSendAll: () => void;
}

export function QueueList({
  queue,
  sending,
  onRemove,
  onClear,
  onSendAll,
}: QueueListProps) {
  const [open, setOpen] = React.useState(true);
  const hasItems = queue.length > 0;

  return (
    <AnimatePresence initial={false}>
      {hasItems && (
        <motion.div
          key="queue"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 40 }}
          className="w-full overflow-hidden border-b border-border-subtle bg-surface-raised"
        >
          <div
            className="flex items-center justify-between h-8 px-s-400 cursor-pointer group/head"
            onClick={() => setOpen((v) => !v)}
          >
            <div className="flex items-center gap-s-200 text-t-sm">
              <motion.span
                animate={{ rotate: open ? 0 : -90 }}
                transition={springFast}
                className="inline-flex text-icon-tertiary"
              >
                <ChevronDown size={12} />
              </motion.span>
              <span className="font-semibold text-text-default">Queue</span>
              <motion.span
                key={queue.length}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springFast}
                className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-r-xs text-t-xs font-medium bg-accent-brand-subtle text-accent-brand"
              >
                {queue.length}
              </motion.span>
            </div>
            <div
              className="flex items-center gap-s-100"
              onClick={(e) => e.stopPropagation()}
            >
              <IconButton
                icon={<Trash2 size={12} />}
                label="Clear queue"
                onClick={onClear}
                size="sm"
                disabled={sending}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 460, damping: 42 }}
                className="overflow-hidden"
              >
                <ul className="flex flex-col gap-s-100 px-s-300 pb-s-200">
                  <AnimatePresence initial={false}>
                    {queue.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, height: 0, marginTop: 0, marginBottom: 0 }}
                        transition={springFast}
                        className={cn(
                          "group/item relative flex items-start gap-s-200 rounded-r-md",
                          "bg-surface-default hover:bg-surface-hover",
                          "shadow-[inset_0_0_0_1px_theme(colors.border-subtle)]",
                          "px-s-200 py-s-150 transition-colors duration-120",
                        )}
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-s-100">
                          <div className="flex items-center gap-s-150">
                            <span className="inline-flex items-center h-4 px-1 rounded-r-xs text-t-xs font-mono bg-surface-raised text-text-default border border-border-subtle">
                              {item.componentName ? `<${item.componentName}>` : `<${item.tag}>`}
                            </span>
                            {item.deltaCount > 0 && (
                              <span className="text-t-xs text-edited font-medium">
                                {item.deltaCount} edit{item.deltaCount === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                          <p className="text-t-sm text-text-secondary line-clamp-2">
                            {item.prompt}
                          </p>
                        </div>
                        <motion.button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          aria-label="Remove from queue"
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.88 }}
                          transition={springFast}
                          disabled={sending}
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-r-sm shrink-0",
                            "text-icon-tertiary hover:text-accent-danger hover:bg-accent-danger-subtle",
                            "opacity-0 group-hover/item:opacity-100 transition-opacity duration-120",
                            "disabled:opacity-40 disabled:pointer-events-none",
                          )}
                        >
                          <X size={11} />
                        </motion.button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="px-s-300 pb-s-300">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onSendAll}
                    disabled={sending}
                    className="w-full"
                  >
                    {sending ? (
                      `Sending ${queue.length}…`
                    ) : (
                      <>
                        Send queue ({queue.length})
                        <Kbd keys="cmd shift enter" size="xs" compact className="ml-s-150" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
