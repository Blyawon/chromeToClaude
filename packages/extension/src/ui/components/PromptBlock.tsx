import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";
import { Kbd } from "../primitives/Kbd";

export interface PromptBlockProps {
  value: string;
  onChange: (next: string) => void;
  onAddToQueue: () => void;
  changedCount: number;
  onIncludeAllEdits?: () => void;
  onResetAll?: () => void;
  disabled?: boolean;
}

export function PromptBlock({
  value,
  onChange,
  onAddToQueue,
  changedCount,
  onIncludeAllEdits,
  onResetAll,
  disabled,
}: PromptBlockProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(Math.max(el.scrollHeight, 80), 220) + "px";
  }, [value]);

  React.useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAddToQueue();
    }
  };

  const charCount = value.length;
  const canAdd = value.trim().length > 0 && !disabled;
  const showCount = charCount > 180;
  const countWarn = charCount > 350;

  return (
    <div className="px-s-400 py-s-300 border-b border-border-subtle flex flex-col gap-s-300 bg-surface-default">
      <motion.div
        whileHover={{ scale: 1.002 }}
        transition={{ type: "spring", stiffness: 600, damping: 40 }}
        className="relative"
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder="Describe the change — e.g. make this the primary CTA"
          spellCheck
          rows={3}
          maxLength={800}
          className={cn(
            "w-full resize-none bg-surface-raised text-t-md text-text-default rounded-r-md px-s-300 py-s-200",
            "placeholder:text-text-tertiary outline-none",
            "shadow-[inset_0_0_0_1px_theme(colors.border-subtle)]",
            "hover:shadow-[inset_0_0_0_1px_theme(colors.border-default)]",
            "focus:bg-surface-raised focus:shadow-focus-inset",
            "transition-colors duration-120 ease-spring",
            "min-h-[80px] max-h-[220px] leading-[1.5]",
          )}
        />
        <AnimatePresence>
          {showCount && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.14 }}
              className={cn(
                "absolute right-s-200 bottom-s-150 text-t-xs font-mono pointer-events-none",
                countWarn ? "text-edited" : "text-text-tertiary",
              )}
            >
              {charCount}/800
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {changedCount > 0 && (
          <motion.div
            key="chips"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={springFast}
            className="flex items-center flex-wrap gap-s-150 overflow-hidden"
          >
            {onIncludeAllEdits && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springFast}
                onClick={onIncludeAllEdits}
                className={cn(
                  "inline-flex items-center gap-s-150 h-6 px-s-200 rounded-r-sm",
                  "bg-accent-brand-subtle text-accent-brand text-t-sm font-medium",
                  "hover:brightness-110 cursor-pointer",
                )}
              >
                <Sparkles size={12} strokeWidth={2.25} />
                Include {changedCount} edit{changedCount === 1 ? "" : "s"}
              </motion.button>
            )}
            {changedCount > 2 && onResetAll && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springFast}
                onClick={onResetAll}
                className={cn(
                  "inline-flex items-center gap-s-150 h-6 px-s-200 rounded-r-sm",
                  "bg-edited-subtle text-edited text-t-sm font-medium",
                  "hover:brightness-110 cursor-pointer",
                )}
              >
                <RotateCcw size={12} strokeWidth={2.25} />
                Reset all
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-s-200">
        <span className="inline-flex items-center gap-s-150 text-t-sm text-text-tertiary">
          <Kbd keys="cmd enter" size="xs" />
          <span>to add</span>
        </span>
        <Button
          variant="primary"
          size="md"
          onClick={onAddToQueue}
          disabled={!canAdd}
          aria-label="Add to queue"
          className="min-w-[140px]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add to queue
        </Button>
      </div>
    </div>
  );
}
