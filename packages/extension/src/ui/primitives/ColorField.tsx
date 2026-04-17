import * as React from "react";
import { createPortal } from "react-dom";
import ColorPicker from "react-best-gradient-color-picker";
import { cn } from "../lib/utils";
import { parseColor, toCss, toHex, isGradient } from "../lib/colors";
import { getRecentColors, pushRecentColor } from "../lib/persistence";
import { useEdited } from "../lib/edited";
import { EditedFieldShell } from "./EditedFieldShell";
import { usePortalContainer } from "../lib/shadow";

export interface ColorFieldProps {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  onReset?: () => void;
  placeholder?: string;
  baseline?: string;
  propertyName?: string;
}

const PANEL_WIDTH = 320;
const PANEL_GAP = 12;
const VIEWPORT_MARGIN = 8;
const ESTIMATED_PANEL_HEIGHT = 380;

const PICKER_STYLE_OVERRIDES = {
  body: { background: "transparent", padding: 0 },
};

function swatchBg(css: string): React.CSSProperties {
  const trimmed = css.trim();
  if (!trimmed) return { background: "#000" };
  if (isGradient(trimmed)) return { background: trimmed };
  const parsed = parseColor(trimmed);
  return { background: parsed ? toCss(parsed) : trimmed };
}

function summarize(css: string): string {
  const trimmed = css.trim();
  if (!trimmed) return "—";
  if (isGradient(trimmed)) return "Gradient";
  const parsed = parseColor(trimmed);
  // If the browser + our parser both reject it, surface "—" instead of the
  // raw invalid string (which looks like a valid label to the user).
  if (!parsed) return "—";
  return toHex(parsed, parsed.a < 1).toUpperCase();
}

class PickerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ColorField] picker crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="text-t-sm text-accent-danger p-s-200">
          Color picker failed to render. See console for details.
        </div>
      );
    }
    return this.props.children;
  }
}

function computePanelCoords(trigger: HTMLElement): { top: number; left: number } {
  const inspector = trigger.closest("#panel") as HTMLElement | null;
  const anchor = inspector?.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();

  let left: number;
  if (anchor) {
    const rightSpace = window.innerWidth - anchor.right - PANEL_GAP;
    const leftSpace = anchor.left - PANEL_GAP;
    if (rightSpace >= PANEL_WIDTH + VIEWPORT_MARGIN) {
      left = anchor.right + PANEL_GAP;
    } else if (leftSpace >= PANEL_WIDTH + VIEWPORT_MARGIN) {
      left = anchor.left - PANEL_GAP - PANEL_WIDTH;
    } else {
      left = Math.max(VIEWPORT_MARGIN, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN);
    }
  } else {
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(triggerRect.left, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN),
    );
  }

  let top = anchor ? anchor.top : triggerRect.bottom + PANEL_GAP;
  if (top + ESTIMATED_PANEL_HEIGHT > window.innerHeight - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, window.innerHeight - ESTIMATED_PANEL_HEIGHT - VIEWPORT_MARGIN);
  }
  return { top, left };
}

export function ColorField({
  value,
  onChange,
  onCommit,
  onReset,
  baseline,
  propertyName,
}: ColorFieldProps) {
  const portalContainer = usePortalContainer();
  const [recent, setRecent] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  const edited = useEdited(value, baseline);
  const valueAtOpenRef = React.useRef<string | null>(null);
  const liveValueRef = React.useRef(value);
  liveValueRef.current = value;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    getRecentColors().then((r) => mounted && setRecent(r));
    return () => {
      mounted = false;
    };
  }, []);

  const setOpenState = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        valueAtOpenRef.current = liveValueRef.current;
      } else {
        const final = liveValueRef.current;
        const start = valueAtOpenRef.current;
        valueAtOpenRef.current = null;
        if (final && final !== start) {
          onCommit?.(final);
          const trimmed = final.trim();
          const recentEntry = isGradient(trimmed)
            ? trimmed
            : (() => {
                const parsed = parseColor(trimmed);
                return parsed ? toHex(parsed, parsed.a < 1) : null;
              })();
          if (recentEntry) void pushRecentColor(recentEntry).then(setRecent);
        }
      }
      setOpen(nextOpen);
    },
    [onCommit],
  );

  // Keep the panel glued to the inspector while it's open — covers scroll,
  // resize, and the user dragging the inspector around (no scroll event for
  // that, so we poll via rAF only while open).
  React.useEffect(() => {
    if (!open) return;
    let raf = 0;
    let lastKey = "";
    const tick = () => {
      const trigger = triggerRef.current;
      if (trigger) {
        const next = computePanelCoords(trigger);
        const key = `${next.top}|${next.left}`;
        if (key !== lastKey) {
          lastKey = key;
          setCoords(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenState(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpenState]);

  const panel =
    open && coords && portalContainer
      ? createPortal(
          <>
            <div
              onPointerDown={() => setOpenState(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2147483646,
                background: "transparent",
              }}
            />
            <div
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                zIndex: 2147483647,
                width: PANEL_WIDTH,
                padding: 12,
                borderRadius: 12,
                background: "rgb(28, 28, 31)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow:
                  "0 18px 48px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)",
              }}
            >
              <PickerErrorBoundary>
                <ColorPicker
                  value={value || "rgba(0,0,0,1)"}
                  onChange={onChange}
                  presets={recent}
                  width={PANEL_WIDTH - 24}
                  height={180}
                  hideColorGuide
                  disableLightMode
                  style={PICKER_STYLE_OVERRIDES}
                />
              </PickerErrorBoundary>
            </div>
          </>,
          portalContainer,
        )
      : null;

  const addToPromptSpec =
    propertyName != null
      ? { propertyName, baselineValue: baseline ?? "", currentValue: value }
      : undefined;

  return (
    <EditedFieldShell edited={edited} onReset={onReset} addToPrompt={addToPromptSpec}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenState(!open)}
        className={cn(
          "flex flex-1 min-w-0 items-center gap-s-200 h-8 rounded-r-md pl-s-150 outline-none",
          "text-left text-t-md text-text-default font-mono",
          "focus-visible:shadow-focus-inset cursor-pointer bg-transparent border-0",
        )}
      >
        <span
          className="h-5 w-5 rounded-r-sm shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]"
          style={swatchBg(value)}
        />
        <span className="truncate">{summarize(value)}</span>
      </button>
      {panel}
    </EditedFieldShell>
  );
}
