import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";

export type AlignKey =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "stretch";

export interface AlignmentPadProps {
  justify: AlignKey;
  align: AlignKey;
  onChange: (next: { justify: AlignKey; align: AlignKey }) => void;
}

const COLS: AlignKey[] = ["flex-start", "center", "flex-end"];
const ROWS: AlignKey[] = ["flex-start", "center", "flex-end"];

export function AlignmentPad({ justify, align, onChange }: AlignmentPadProps) {
  return (
    <div
      role="grid"
      className="grid h-16 w-16 grid-cols-3 grid-rows-3 gap-px rounded-r-md bg-surface-default p-1 shadow-[inset_0_0_0_1px_theme(colors.border-subtle)]"
    >
      {ROWS.map((r) =>
        COLS.map((c) => {
          const active = c === justify && r === align;
          return (
            <motion.button
              key={`${r}-${c}`}
              type="button"
              aria-label={`align ${r}/${c}`}
              aria-pressed={active}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={springFast}
              onClick={() => onChange({ justify: c, align: r })}
              className={cn(
                "group flex items-center justify-center rounded-r-xs transition-colors duration-120",
                "hover:bg-surface-hover",
                active && "bg-accent-brand-subtle hover:bg-accent-brand-subtle",
              )}
            >
              <motion.span
                animate={{ scale: active ? 1.2 : 1 }}
                transition={springFast}
                className={cn(
                  "h-[3px] w-[3px] rounded-full",
                  active ? "bg-icon-brand" : "bg-icon-tertiary group-hover:bg-icon-default",
                )}
              />
            </motion.button>
          );
        }),
      )}
    </div>
  );
}
