import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { springFast } from "../lib/motion";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "absolute bottom-s-300 right-s-300 z-[2147483647] flex flex-col gap-s-150 outline-none list-none m-0 p-0",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: "default" | "error" | "success" }
>(({ className, variant = "default", children, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} asChild {...props}>
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.98, transition: { duration: 0.14 } }}
      transition={springFast}
      className={cn(
        "rounded-r-md bg-surface-raised px-s-300 py-s-200 text-t-md border border-border-default shadow-depth-2",
        variant === "error" && "text-accent-danger border-accent-danger/40",
        variant === "success" && "text-accent-success border-accent-success/40",
        variant === "default" && "text-text-default",
        className,
      )}
    >
      {children}
    </motion.div>
  </ToastPrimitive.Root>
));
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
