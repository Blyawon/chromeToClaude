import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { usePortalContainer } from "../lib/shadow";
import { useEdited } from "../lib/edited";
import {
  EditedFieldShell,
  hasActions,
  EDITED_ACTIONS_PAD,
} from "./EditedFieldShell";

export interface SelectOption {
  value: string;
  label?: string;
  description?: string;
}

export interface SelectProps {
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  icon?: React.ReactNode;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  baseline?: string;
  onReset?: () => void;
  propertyName?: string;
}

export function Select({
  value,
  onChange,
  options,
  icon,
  label,
  placeholder,
  className,
  disabled,
  baseline,
  onReset,
  propertyName,
}: SelectProps) {
  const container = usePortalContainer();
  const edited = useEdited(value, baseline);
  const current = options.find((o) => o.value === value);
  const addToPromptSpec =
    propertyName != null
      ? { propertyName, baselineValue: baseline ?? "", currentValue: value }
      : undefined;
  const actionsVisible = hasActions(edited, onReset, addToPromptSpec);

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
      <EditedFieldShell
        edited={edited}
        onReset={onReset}
        addToPrompt={addToPromptSpec}
        disabled={disabled}
        className={className}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex flex-1 min-w-0 items-center h-8 rounded-r-md relative outline-none bg-transparent",
            "text-text-default",
            "data-[state=open]:bg-surface-raised data-[state=open]:shadow-focus-inset",
            "focus-visible:shadow-focus-inset",
            "transition-colors duration-120 ease-spring",
          )}
        >
          {icon && (
            <span className="flex h-8 w-7 items-center justify-center text-icon-tertiary shrink-0">
              <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
            </span>
          )}
          {label && !icon && (
            <span className="flex h-8 w-7 items-center justify-center text-t-sm font-medium text-icon-tertiary shrink-0 select-none">
              {label}
            </span>
          )}
          <span
            className={cn(
              "flex-1 min-w-0 text-left text-t-md font-mono truncate",
              icon || label ? "pl-0" : "pl-s-300",
              actionsVisible ? EDITED_ACTIONS_PAD : "pr-6",
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder ?? "Select…"}>
              {current?.label ?? current?.value}
            </SelectPrimitive.Value>
          </span>
          {!actionsVisible && (
            <SelectPrimitive.Icon asChild>
              <ChevronDown
                size={12}
                className="absolute right-s-200 top-1/2 -translate-y-1/2 text-icon-tertiary pointer-events-none"
              />
            </SelectPrimitive.Icon>
          )}
        </SelectPrimitive.Trigger>
      </EditedFieldShell>
      <SelectPrimitive.Portal container={container ?? undefined}>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            "z-[2147483647] min-w-[var(--radix-select-trigger-width)] max-h-[280px]",
            "rounded-r-md bg-surface-default border border-border-default shadow-depth-3",
            "overflow-hidden origin-top outline-none font-sans",
            "data-[state=open]:animate-[tooltip-in_140ms_cubic-bezier(0.32,0.72,0,1)]",
            "data-[state=closed]:animate-[tooltip-out_100ms_ease-out]",
          )}
        >
          <SelectPrimitive.Viewport className="p-s-100 scroll-panel">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex items-center h-7 px-s-200 pr-s-400 rounded-r-sm cursor-pointer",
                  "text-t-md text-text-default font-mono outline-none",
                  "data-[highlighted]:bg-surface-selected data-[highlighted]:text-text-default",
                  "data-[state=checked]:text-accent-brand",
                  "transition-colors duration-80",
                )}
              >
                <SelectPrimitive.ItemText>
                  {o.label ?? o.value}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-s-200 inline-flex items-center">
                  <Check size={12} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
