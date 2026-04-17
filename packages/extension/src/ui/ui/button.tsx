import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-s-150 rounded-r-md font-semibold",
    "transition-colors duration-120 ease-spring outline-none select-none",
    "focus-visible:shadow-focus",
  ].join(" "),
  {
    variants: {
      variant: {
        // Figma SDS primary: brand fill with inverse (near-black) text.
        // Disabled state keeps the brand tint dimmed so users can still see
        // what the button does before they're allowed to click it.
        primary: [
          "bg-accent-brand !text-text-inverse",
          "hover:bg-accent-brand-hover active:bg-accent-brand-pressed",
          "disabled:bg-accent-brand/30 disabled:!text-text-inverse/60 disabled:cursor-not-allowed",
        ].join(" "),
        secondary:
          "bg-surface-raised text-text-default hover:bg-surface-hover active:bg-surface-pressed disabled:opacity-50 disabled:pointer-events-none",
        ghost:
          "bg-transparent text-text-default hover:bg-surface-hover active:bg-surface-pressed disabled:opacity-40 disabled:pointer-events-none",
        danger:
          "bg-accent-danger-subtle text-accent-danger hover:brightness-125 disabled:opacity-40 disabled:pointer-events-none",
      },
      size: {
        sm: "h-7 px-s-300 text-t-md",
        md: "h-8 px-s-400 text-t-md",
        lg: "h-9 px-s-400 text-t-lg",
        icon: "h-7 w-7 p-0",
        iconSm: "h-6 w-6 p-0",
        iconLg: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "ghost", size: "sm" },
  },
);

type MotionButtonBaseProps = Omit<
  HTMLMotionProps<"button">,
  "color" | "size"
> &
  VariantProps<typeof buttonVariants>;

export interface ButtonProps extends MotionButtonBaseProps {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={springFast}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </motion.button>
  ),
);
Button.displayName = "Button";
