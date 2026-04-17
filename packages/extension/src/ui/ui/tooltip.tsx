import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { usePortalContainer } from "../lib/shadow";
import { cn } from "../lib/utils";

export const TooltipProvider: React.FC<TooltipPrimitive.TooltipProviderProps> = (
  props,
) => <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={200} {...props} />;

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => {
  const container = usePortalContainer();
  return (
    <TooltipPrimitive.Portal container={container ?? undefined}>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[2147483647] rounded-r-md bg-surface-raised px-s-200 py-s-100 text-t-sm text-text-default",
          "shadow-depth-2 border border-border-default pointer-events-none origin-[var(--radix-tooltip-content-transform-origin)]",
          "data-[state=open]:animate-[tooltip-in_140ms_cubic-bezier(0.32,0.72,0,1)]",
          "data-[state=closed]:animate-[tooltip-out_100ms_ease-out]",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
