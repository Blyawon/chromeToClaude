import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "framer-motion";
import { usePortalContainer } from "../lib/shadow";
import { cn } from "../lib/utils";
import { popoverMotion } from "../lib/motion";

interface PopoverCtx {
  open: boolean;
}
const PopoverContext = React.createContext<PopoverCtx>({ open: false });

export interface PopoverProps
  extends React.ComponentProps<typeof PopoverPrimitive.Root> {}

export function Popover({
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const open = controlledOpen ?? internalOpen;
  const handleOpenChange = (next: boolean) => {
    if (controlledOpen == null) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <PopoverContext.Provider value={{ open }}>
        {children}
      </PopoverContext.Provider>
    </PopoverPrimitive.Root>
  );
}

export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 8, ...props }, ref) => {
  const container = usePortalContainer();
  const { open } = React.useContext(PopoverContext);
  return (
    <AnimatePresence>
      {open && (
        <PopoverPrimitive.Portal container={container ?? undefined} forceMount>
          <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            asChild
            forceMount
            {...props}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={popoverMotion}
              className={cn(
                "z-[2147483647] rounded-r-lg bg-surface-default border border-border-default shadow-depth-3",
                "text-text-default origin-top-left outline-none",
                className,
              )}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
