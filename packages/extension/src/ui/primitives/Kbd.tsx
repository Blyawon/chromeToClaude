import {
  ArrowBigUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Command,
  CornerDownLeft,
  Delete,
  Option,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/utils";

interface KbdProps {
  /**
   * space- or +-delimited key tokens ("cmd shift enter", "cmd+k")
   * or Unicode glyphs ("⌘⇧E", "⌘⏎"). Both forms are accepted and normalized.
   */
  keys: string;
  /** Size preset — sm (default) or md. xs kept as alias of sm for back-compat. */
  size?: "xs" | "sm" | "md";
  /** Render every token inside one keycap instead of one cap per token. */
  compact?: boolean;
  /** extra classes for the wrapping span */
  className?: string;
}

const ICON: Record<string, LucideIcon> = {
  cmd: Command,
  command: Command,
  meta: Command,
  mod: Command,
  shift: ArrowBigUp,
  alt: Option,
  option: Option,
  enter: CornerDownLeft,
  return: CornerDownLeft,
  up: ArrowUp,
  down: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
  backspace: Delete,
  delete: Delete,
};

const TEXT_ALIAS: Record<string, string> = {
  esc: "Esc",
  escape: "Esc",
  tab: "Tab",
  space: "Space",
  plus: "+",
  "?": "?",
};

// Map Mac-style modifier glyphs to canonical token names so callers can write
// "⌘⇧E" (the OS-visible shortcut) and still get the same rendering as
// "cmd shift e".
const GLYPH_TO_TOKEN: Record<string, string> = {
  "⌘": "cmd",
  "⇧": "shift",
  "⌥": "alt",
  "⌃": "ctrl",
  "⏎": "enter",
  "↩": "enter",
  "↑": "up",
  "↓": "down",
  "←": "left",
  "→": "right",
  "⌫": "backspace",
  "⌦": "delete",
  "⎋": "esc",
  "␣": "space",
  "⇥": "tab",
};

// Uniform 14x14 icons + matching 12px text across the app.
const sizeSpec = {
  xs: { cap: "h-6 min-w-6 px-1.5 text-[12px]", icon: 14, gap: "gap-1" },
  sm: { cap: "h-6 min-w-6 px-1.5 text-[12px]", icon: 14, gap: "gap-1" },
  md: { cap: "h-7 min-w-7 px-2 text-[13px]", icon: 14, gap: "gap-1" },
} as const;

function tokenize(raw: string): string[] {
  const out: string[] = [];
  // First normalize: split on whitespace / plus, then expand any clustered
  // glyphs (e.g. "⌘⇧E") into separate tokens.
  for (const chunk of raw.split(/[\s+]+/).filter(Boolean)) {
    let buffer = "";
    for (const ch of chunk) {
      if (GLYPH_TO_TOKEN[ch]) {
        if (buffer) {
          out.push(buffer.toLowerCase());
          buffer = "";
        }
        out.push(GLYPH_TO_TOKEN[ch]);
      } else {
        buffer += ch;
      }
    }
    if (buffer) out.push(buffer.toLowerCase());
  }
  return out;
}

function renderToken(tok: string, iconSize: number) {
  const Icon = ICON[tok];
  const text = TEXT_ALIAS[tok];
  if (Icon) return <Icon size={iconSize} strokeWidth={2} />;
  if (text) return <span className="leading-none">{text}</span>;
  return <span className="uppercase leading-none">{tok}</span>;
}

export function Kbd({ keys, size = "sm", compact = false, className }: KbdProps) {
  const spec = sizeSpec[size];
  const tokens = tokenize(keys);

  if (compact) {
    return (
      <span className={cn("inline-flex items-center font-mono select-none", className)}>
        <kbd
          className={cn(
            "inline-flex items-center justify-center gap-0.5 rounded-r-sm",
            "bg-surface-page text-text-default",
            "shadow-[inset_0_-1px_0_rgba(0,0,0,0.4),inset_0_0_0_1px_theme(colors.border-strong)]",
            spec.cap,
          )}
        >
          {tokens.map((tok, i) => (
            <span key={i} className="inline-flex items-center">
              {renderToken(tok, spec.icon)}
            </span>
          ))}
        </kbd>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center font-mono select-none", spec.gap, className)}>
      {tokens.map((tok, i) => (
        <kbd
          key={i}
          className={cn(
            "inline-flex items-center justify-center rounded-r-sm",
            // Keycap bg must be distinct from tooltip/modal bg (surface-raised/default).
            "bg-surface-page text-text-default",
            "shadow-[inset_0_-1px_0_rgba(0,0,0,0.4),inset_0_0_0_1px_theme(colors.border-strong)]",
            spec.cap,
          )}
        >
          {renderToken(tok, spec.icon)}
        </kbd>
      ))}
    </span>
  );
}
