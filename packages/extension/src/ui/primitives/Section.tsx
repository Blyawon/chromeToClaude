import * as React from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";

export interface SectionProps {
  id: string;
  title: string;
  actions?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}

export function Section({
  id,
  title,
  actions,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = true,
  count,
  children,
}: SectionProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen == null) setInternalOpen(v);
    onOpenChange?.(v);
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-b border-border-subtle group/section"
      data-section={id}
    >
      <div
        className={cn(
          "flex h-9 items-center gap-s-200 px-s-400 text-t-lg",
          "transition-colors duration-120",
          open ? "text-text-default" : "text-text-secondary",
          "hover:bg-surface-hover hover:text-text-default",
        )}
      >
        <CollapsibleTrigger
          className={cn(
            "flex flex-1 items-center gap-s-200 outline-none text-left cursor-pointer",
            "focus-visible:text-text-default",
          )}
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={springFast}
            className="inline-flex text-icon-tertiary shrink-0"
          >
            <ChevronRight size={12} />
          </motion.span>
          <span className="font-medium">{title}</span>
          {count != null && count > 0 && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springFast}
              className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-r-xs text-t-xs font-medium bg-edited-subtle text-edited"
            >
              {count}
            </motion.span>
          )}
        </CollapsibleTrigger>
        {actions && (
          <div
            className={cn(
              "flex items-center gap-s-050 transition-opacity duration-120",
              "opacity-0 group-hover/section:opacity-100",
              open && "opacity-100",
            )}
          >
            {actions}
          </div>
        )}
      </div>
      <CollapsibleContent>
        <div className="w-full pb-s-300 px-s-400 pt-s-100 flex flex-col gap-s-200 min-w-0">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
