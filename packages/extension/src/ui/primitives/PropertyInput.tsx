import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import {
  formatNumeric,
  parseNumericExpression,
  splitNumericUnit,
} from "../lib/math";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { springFast } from "../lib/motion";
import { AddToPromptContext, type AddToPromptFn } from "../lib/addToPrompt";
import { useEdited } from "../lib/edited";
import {
  EditedFieldShell,
  hasActions,
  EDITED_ACTIONS_PAD,
} from "./EditedFieldShell";

export { AddToPromptContext };
export type { AddToPromptFn };

const UNIT_CYCLE = ["px", "rem", "em", "%"];

export interface PropertyInputProps {
  icon?: React.ReactNode;
  label?: string;
  propertyName?: string;
  value: string;
  baseline?: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  onReset?: () => void;
  onAddToPrompt?: AddToPromptFn;
  fallbackUnit?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dragScrub?: boolean;
  validate?: (raw: string) => boolean;
}

export const PropertyInput = React.forwardRef<HTMLInputElement, PropertyInputProps>(
  (
    {
      icon,
      label,
      propertyName,
      value,
      baseline,
      onChange,
      onCommit,
      onReset,
      onAddToPrompt,
      fallbackUnit = "px",
      step = 1,
      min,
      max,
      placeholder,
      disabled,
      className,
      dragScrub = true,
      validate,
    },
    ref,
  ) => {
    const [draft, setDraft] = React.useState(value);
    const [focused, setFocused] = React.useState(false);
    const [invalid, setInvalid] = React.useState(false);
    const valueRef = React.useRef(value);
    valueRef.current = value;
    const edited = useEdited(value, baseline);
    const ctxAddToPrompt = React.useContext(AddToPromptContext);
    const effectiveAddToPrompt = onAddToPrompt ?? ctxAddToPrompt ?? undefined;
    const addToPromptSpec =
      propertyName && effectiveAddToPrompt
        ? {
            propertyName,
            baselineValue: baseline ?? "",
            currentValue: value,
          }
        : undefined;
    const actionsVisible = hasActions(edited, onReset, addToPromptSpec);

    React.useEffect(() => {
      if (!focused) setDraft(value);
    }, [value, focused]);

    const clamp = (v: number) => {
      if (min != null && v < min) return min;
      if (max != null && v > max) return max;
      return v;
    };

    const triggerInvalid = () => {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 240);
    };

    const commit = (raw: string) => {
      if (validate && !validate(raw)) {
        triggerInvalid();
        setDraft(valueRef.current);
        return;
      }
      const parsed = parseNumericExpression(raw, { fallbackUnit });
      if (parsed) {
        const next = formatNumeric(clamp(parsed.value), parsed.unit);
        setDraft(next);
        onChange(next);
        onCommit?.(next);
        return;
      }
      const trimmed = raw.trim();
      if (trimmed && trimmed !== valueRef.current) {
        onChange(trimmed);
        onCommit?.(trimmed);
      } else {
        setDraft(valueRef.current);
      }
    };

    const bumpBy = (delta: number) => {
      const parsed = splitNumericUnit(draft, fallbackUnit);
      if (!parsed) return;
      const next = formatNumeric(clamp(parsed.value + delta), parsed.unit);
      setDraft(next);
      onChange(next);
    };

    const cycleUnit = (e: React.MouseEvent) => {
      const parsed = splitNumericUnit(draft, fallbackUnit);
      if (!parsed) return;
      e.preventDefault();
      const idx = UNIT_CYCLE.indexOf(parsed.unit);
      const nextUnit = UNIT_CYCLE[(idx + 1) % UNIT_CYCLE.length];
      const next = formatNumeric(parsed.value, nextUnit);
      setDraft(next);
      onChange(next);
      onCommit?.(next);
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
        return;
      }
      if (e.key === "Escape") {
        setDraft(valueRef.current);
        e.currentTarget.blur();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const dir = e.key === "ArrowUp" ? 1 : -1;
        const amount = e.shiftKey ? 10 : e.altKey ? 0.1 : step;
        bumpBy(dir * amount);
        e.preventDefault();
      }
    };

    const startScrub = (startEvent: React.PointerEvent<HTMLSpanElement>) => {
      if (!dragScrub || disabled) return;
      if (startEvent.button !== 0) return;
      const parsed = splitNumericUnit(draft, fallbackUnit);
      if (!parsed) return;
      const startX = startEvent.clientX;
      const startValue = parsed.value;
      const unit = parsed.unit;
      startEvent.preventDefault();
      (startEvent.target as HTMLElement).setPointerCapture(startEvent.pointerId);
      document.body.style.cursor = "ew-resize";

      let rafId = 0;
      let pending: string | null = null;
      const flush = () => {
        rafId = 0;
        if (pending != null) {
          setDraft(pending);
          onChange(pending);
          pending = null;
        }
      };

      const move = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const multiplier = e.shiftKey ? 10 * step : e.altKey ? 0.1 * step : step;
        pending = formatNumeric(clamp(startValue + dx * multiplier), unit);
        if (!rafId) rafId = requestAnimationFrame(flush);
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        document.body.style.cursor = "";
        if (rafId) cancelAnimationFrame(rafId);
        flush();
        onCommit?.(valueRef.current);
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    };

    const iconSlot = icon || label ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.span
            onPointerDown={startScrub}
            onContextMenu={cycleUnit}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={springFast}
            className={cn(
              "flex h-8 w-7 items-center justify-center select-none shrink-0",
              "text-icon-tertiary",
              dragScrub && "cursor-ew-resize hover:text-icon-default",
            )}
          >
            {icon ? (
              <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
            ) : (
              <span className="text-t-sm font-medium">{label}</span>
            )}
          </motion.span>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex gap-s-200">
          <span className="font-mono">{propertyName ?? label ?? "drag"}</span>
          {dragScrub && <span className="text-text-tertiary">drag · ⇧ ×10</span>}
        </TooltipContent>
      </Tooltip>
    ) : null;

    return (
      <EditedFieldShell
        edited={edited}
        onReset={onReset}
        addToPrompt={addToPromptSpec}
        invalid={invalid}
        disabled={disabled}
        className={className}
      >
        {iconSlot}
        <input
          ref={ref}
          type="text"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={onKey}
          className={cn(
            "h-8 flex-1 min-w-0 bg-transparent text-t-md text-text-default font-mono",
            "placeholder:text-text-tertiary outline-none",
            !icon && !label ? "pl-s-300" : "pl-0",
            actionsVisible ? EDITED_ACTIONS_PAD : "pr-s-300",
          )}
        />
      </EditedFieldShell>
    );
  },
);
PropertyInput.displayName = "PropertyInput";
