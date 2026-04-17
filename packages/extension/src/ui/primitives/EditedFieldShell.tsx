import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CornerDownLeft, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";
import { AddToPromptContext } from "../lib/addToPrompt";

export interface AddToPromptSpec {
  propertyName: string;
  baselineValue: string;
  currentValue: string;
}

export interface EditedFieldShellProps {
  edited: boolean;
  onReset?: () => void;
  addToPrompt?: AddToPromptSpec;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const EDITED_ACTIONS_PAD = "pr-14";

export function hasActions(
  edited: boolean,
  onReset?: () => void,
  addToPrompt?: AddToPromptSpec,
) {
  return edited && (Boolean(onReset) || Boolean(addToPrompt));
}

export function EditedFieldShell({
  edited,
  onReset,
  addToPrompt,
  invalid,
  disabled,
  className,
  children,
}: EditedFieldShellProps) {
  return (
    <motion.div
      animate={invalid ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
      transition={invalid ? { duration: 0.24 } : { duration: 0 }}
      className={cn(
        "group relative flex items-center h-8 rounded-r-md transition-colors duration-120 ease-spring",
        edited
          ? "bg-edited-subtle hover:bg-edited-subtle"
          : "bg-surface-default hover:bg-surface-hover",
        "focus-within:bg-surface-raised focus-within:shadow-focus-inset",
        edited && "shadow-[inset_3px_0_0_0_theme(colors.edited)]",
        invalid && "shadow-[inset_0_0_0_1px_theme(colors.accent-danger)]",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {children}
      <EditedActions edited={edited} onReset={onReset} addToPrompt={addToPrompt} />
    </motion.div>
  );
}

function EditedActions({
  edited,
  onReset,
  addToPrompt,
}: {
  edited: boolean;
  onReset?: () => void;
  addToPrompt?: AddToPromptSpec;
}) {
  const ctxAddToPrompt = React.useContext(AddToPromptContext);
  const canAddToPrompt = Boolean(addToPrompt && ctxAddToPrompt);
  const [addedFlash, setAddedFlash] = React.useState(false);
  const visible = edited && (canAddToPrompt || Boolean(onReset));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="actions"
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 4 }}
          transition={springFast}
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
            "rounded-r-sm px-0.5 py-0.5",
            "bg-surface-raised/55 backdrop-blur-[6px]",
            "shadow-[inset_0_0_0_1px_theme(colors.border-subtle)]",
          )}
        >
          {canAddToPrompt && addToPrompt && ctxAddToPrompt && (
            <motion.button
              key="add"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ctxAddToPrompt(
                  addToPrompt.propertyName,
                  addToPrompt.baselineValue,
                  addToPrompt.currentValue,
                );
                setAddedFlash(true);
                setTimeout(() => setAddedFlash(false), 800);
              }}
              aria-label="Add this change to the prompt"
              title="Add to prompt"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={springFast}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-r-sm",
                "text-icon-default hover:text-accent-brand hover:bg-accent-brand-subtle",
                "transition-colors duration-120",
                addedFlash && "text-accent-success bg-accent-success-subtle",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {addedFlash ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={springFast}
                  >
                    <Check size={14} strokeWidth={2.25} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="arrow"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={springFast}
                  >
                    <CornerDownLeft size={14} strokeWidth={2.25} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
          {onReset && (
            <motion.button
              key="reset"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              aria-label="Reset to original"
              title="Reset"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={springFast}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-r-sm",
                "text-icon-default hover:text-text-default hover:bg-surface-pressed",
                "transition-colors duration-120",
              )}
            >
              <RotateCcw size={14} strokeWidth={2.25} />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
