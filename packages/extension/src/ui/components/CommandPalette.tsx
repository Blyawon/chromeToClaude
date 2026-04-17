import * as React from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "../lib/utils";
import { usePortalContainer } from "../lib/shadow";
import { useScrollLock } from "../lib/scrollLock";
import { Kbd } from "../primitives/Kbd";

export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  group?: string;
  run: () => void;
  keywords?: string[];
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const container = usePortalContainer();
  const [value, setValue] = React.useState("");

  useScrollLock(open);

  React.useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  if (!container) return null;

  const groups: Record<string, CommandItem[]> = {};
  for (const it of items) {
    const g = it.group ?? "Actions";
    (groups[g] ??= []).push(it);
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          className="fixed inset-0 z-[2147483647] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-[2px]"
        >
          <motion.div
            key="card"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="font-sans"
          >
            <Command
              loop
              className={cn(
                "w-[420px] rounded-r-lg overflow-hidden font-sans",
                "bg-surface-default text-text-default",
                "border border-border-default shadow-depth-4",
              )}
            >
              <div className="flex items-center h-12 px-s-400 border-b border-border-subtle gap-s-300">
                <Search size={14} className="text-icon-tertiary shrink-0" />
                <Command.Input
                  value={value}
                  onValueChange={setValue}
                  placeholder="Type a command or search…"
                  autoFocus
                  className={cn(
                    "flex-1 h-12 bg-transparent text-t-lg text-text-default outline-none",
                    "placeholder:text-text-tertiary font-sans",
                  )}
                />
                <Kbd keys="cmd k" size="sm" />
              </div>
              <Command.List className="max-h-[400px] overflow-auto scroll-panel p-s-200 font-sans">
                <Command.Empty className="py-s-600 text-center text-t-md text-text-tertiary">
                  No matching commands
                </Command.Empty>
                {Object.entries(groups).map(([groupName, groupItems]) => (
                  <Command.Group key={groupName} className="mb-s-200">
                    <div className="px-s-300 pt-s-200 pb-s-100 text-[10px] uppercase tracking-[0.08em] text-text-tertiary font-semibold leading-none">
                      {groupName}
                    </div>
                    {groupItems.map((it) => (
                      <Command.Item
                        key={it.id}
                        value={`${it.label} ${it.keywords?.join(" ") ?? ""}`}
                        onSelect={() => {
                          it.run();
                          onClose();
                        }}
                        className={cn(
                          "flex items-center gap-s-300 h-9 px-s-300 rounded-r-md cursor-pointer",
                          "text-t-md text-text-default font-sans",
                          "data-[selected=true]:bg-surface-selected",
                          "data-[selected=true]:shadow-[inset_0_0_0_1px_theme(colors.border-default)]",
                          "transition-colors duration-80",
                        )}
                      >
                        {it.icon && (
                          <span className="flex h-4 w-4 items-center justify-center text-icon-secondary">
                            {it.icon}
                          </span>
                        )}
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.shortcut && <Kbd keys={it.shortcut} size="sm" />}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
              <div className="flex items-center justify-between h-9 px-s-300 border-t border-border-subtle text-t-xs text-text-tertiary font-sans">
                <div className="flex items-center gap-s-300">
                  <span className="inline-flex items-center gap-s-150">
                    <Kbd keys="up" size="xs" />
                    <Kbd keys="down" size="xs" />
                    <span>navigate</span>
                  </span>
                  <span className="inline-flex items-center gap-s-150">
                    <Kbd keys="enter" size="xs" />
                    <span>select</span>
                  </span>
                </div>
                <span className="inline-flex items-center gap-s-150">
                  <Kbd keys="esc" size="xs" />
                  <span>close</span>
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  );
}
