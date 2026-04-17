import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/utils";

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsible(): CollapsibleContextValue {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible parts must be used within <Collapsible>");
  return ctx;
}

export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open: controlledOpen, defaultOpen = false, onOpenChange, children, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolled] = React.useState(defaultOpen);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = (next: boolean) => {
      if (controlledOpen == null) setUncontrolled(next);
      onOpenChange?.(next);
    };
    const value = React.useMemo(() => ({ open, setOpen }), [open]);
    return (
      <div ref={ref} {...props}>
        <CollapsibleContext.Provider value={value}>{children}</CollapsibleContext.Provider>
      </div>
    );
  },
);
Collapsible.displayName = "Collapsible";

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, className, ...props }, ref) => {
  const { open, setOpen } = useCollapsible();
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      onClick={(e) => {
        setOpen(!open);
        onClick?.(e);
      }}
      data-state={open ? "open" : "closed"}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open } = useCollapsible();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { type: "spring", stiffness: 420, damping: 40, mass: 0.9 },
            opacity: { duration: 0.14, ease: [0.32, 0.72, 0, 1] },
          }}
          className={cn("w-full overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
