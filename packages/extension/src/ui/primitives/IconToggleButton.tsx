import * as React from "react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";
import { Kbd } from "./Kbd";

export interface IconToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  icon: React.ReactNode;
  active?: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  shortcut?: string;
  size?: "sm" | "md";
}

export const IconToggleButton = React.forwardRef<HTMLButtonElement, IconToggleButtonProps>(
  ({ icon, active, onChange, label, shortcut, className, onClick, size = "sm", ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onChange?.(!active);
      onClick?.(e);
    };
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            ref={ref}
            type="button"
            aria-label={label}
            aria-pressed={!!active}
            onClick={handleClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={springFast}
            className={cn(
              "inline-flex items-center justify-center rounded-r-md transition-colors duration-120 outline-none",
              "text-icon-secondary hover:text-icon-default hover:bg-surface-hover",
              "active:bg-surface-pressed",
              "focus-visible:shadow-focus",
              active &&
                "bg-surface-selected text-icon-default shadow-[inset_0_0_0_1px_theme(colors.border-default)]",
              size === "sm" ? "h-6 w-6" : "h-7 w-7",
              className,
            )}
            {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
          >
            <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-s-200">
          <span>{label}</span>
          {shortcut && <Kbd keys={shortcut} size="xs" />}
        </TooltipContent>
      </Tooltip>
    );
  },
);
IconToggleButton.displayName = "IconToggleButton";
