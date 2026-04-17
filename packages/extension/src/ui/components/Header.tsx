import * as React from "react";
import {
  Crosshair,
  GripVertical,
  MoreHorizontal,
  Redo2,
  Undo2,
  X,
} from "lucide-react";
import { IconButton } from "../primitives/IconButton";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export interface HeaderProps {
  tag: string;
  componentName?: string;
  picking: boolean;
  onTogglePicker: () => void;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenPalette: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function Header({
  tag,
  componentName,
  picking,
  onTogglePicker,
  onClose,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenPalette,
  dragHandleProps,
}: HeaderProps) {
  const chipLabel = componentName ? `<${componentName}>` : `<${tag}>`;
  return (
    <header
      className={cn(
        "flex h-11 items-center gap-s-100 bg-surface-default/95 backdrop-blur-md px-s-200 border-b border-border-subtle",
        "rounded-t-r-lg",
      )}
    >
      <div
        {...dragHandleProps}
        aria-label="Drag to move"
        title="Drag to move"
        className="flex items-center justify-center h-7 w-6 rounded-r-md text-icon-tertiary hover:text-icon-default hover:bg-surface-hover transition-colors duration-120 cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical size={14} />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-s-200">
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          key={chipLabel}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-r-sm bg-surface-raised px-s-200 text-t-sm font-mono",
            "text-text-default truncate border border-border-subtle",
          )}
          title={chipLabel}
        >
          {chipLabel}
        </motion.span>
      </div>
      <IconButton
        icon={<Undo2 size={13} />}
        label="Undo"
        shortcut="cmd z"
        onClick={onUndo}
        disabled={!canUndo}
        size="md"
      />
      <IconButton
        icon={<Redo2 size={13} />}
        label="Redo"
        shortcut="cmd shift z"
        onClick={onRedo}
        disabled={!canRedo}
        size="md"
      />
      <IconButton
        icon={
          <motion.span
            animate={picking ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={picking ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" } : {}}
            className="flex items-center justify-center"
          >
            <Crosshair size={13} />
          </motion.span>
        }
        label={picking ? "Picking… (Esc cancels)" : "Pick element"}
        shortcut="cmd shift e"
        onClick={onTogglePicker}
        active={picking}
        size="md"
      />
      <IconButton
        icon={<MoreHorizontal size={14} />}
        label="Commands"
        shortcut="cmd k"
        onClick={onOpenPalette}
        size="md"
      />
      <IconButton
        icon={<X size={13} />}
        label="Close"
        shortcut="esc"
        onClick={onClose}
        size="md"
      />
    </header>
  );
}
