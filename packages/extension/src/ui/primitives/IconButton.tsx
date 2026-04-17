import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { springFast } from "../lib/motion";
import { Kbd } from "./Kbd";

export interface IconButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

const sizeClass = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
};

const iconSize = { sm: 13, md: 14, lg: 16 } as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      shortcut,
      active,
      size = "md",
      tooltipSide = "bottom",
      className,
      disabled,
      ...props
    },
    ref,
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          whileHover={disabled ? undefined : { scale: 1.08 }}
          whileTap={disabled ? undefined : { scale: 0.88 }}
          transition={springFast}
          className={cn(
            "inline-flex items-center justify-center rounded-r-md transition-colors duration-120 outline-none",
            "text-icon-secondary hover:text-icon-default hover:bg-surface-hover",
            "active:bg-surface-pressed",
            "focus-visible:shadow-focus",
            "disabled:opacity-40 disabled:pointer-events-none",
            active &&
              "bg-surface-selected text-icon-default shadow-[inset_0_0_0_1px_theme(colors.border-default)]",
            sizeClass[size],
            className,
          )}
          {...props}
        >
          <span
            className="flex items-center justify-center"
            style={{ width: iconSize[size], height: iconSize[size] }}
          >
            {icon}
          </span>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="flex items-center gap-s-200">
        <span>{label}</span>
        {shortcut && <Kbd keys={shortcut} size="xs" />}
      </TooltipContent>
    </Tooltip>
  ),
);
IconButton.displayName = "IconButton";
