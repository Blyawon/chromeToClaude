import * as React from "react";

export type HotkeyHandler = (e: KeyboardEvent) => void | boolean;

export interface HotkeyOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  /** Allow the hotkey to fire while focus is inside an input/textarea/contentEditable. Default: false. */
  allowInEditable?: boolean;
}

// Walk the event's composed path so we can see through shadow DOM boundaries.
// Window-level listeners would otherwise see `event.target` retargeted to the
// shadow host and miss the fact that focus is actually inside a textarea.
function isEditableInPath(e: KeyboardEvent): boolean {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [];
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.isContentEditable) return true;
    const tag = node.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  }
  return false;
}

function matches(pattern: string, e: KeyboardEvent): boolean {
  const parts = pattern.toLowerCase().split(/[+\s]+/).filter(Boolean);
  const has = (k: string) => parts.includes(k);
  const needCmd = has("cmd") || has("meta");
  const needCtrl = has("ctrl") || has("control");
  const needMod = has("mod");
  const needShift = has("shift");
  const needAlt = has("alt") || has("option");
  const key = parts.find(
    (p) => !["cmd", "meta", "ctrl", "control", "mod", "shift", "alt", "option"].includes(p),
  );

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const modPressed = isMac ? e.metaKey : e.ctrlKey;

  if (needMod && !modPressed) return false;
  if (needCmd && !e.metaKey) return false;
  if (needCtrl && !e.ctrlKey) return false;
  // Symbols like "?" or "/" carry an implicit Shift on US layouts but not on
  // others — matching by `e.key` is already layout-correct, so when the
  // pattern is just a symbol character we skip the Shift check.
  const isSymbolKey = !!key && key.length === 1 && !/[a-z0-9]/.test(key);
  if (!isSymbolKey && needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;
  if (!key) return true;

  const pressed = e.key.toLowerCase();
  if (pressed === key) return true;
  // Aliases: enter/return, esc/escape, arrows with "arrow" prefix.
  if (key === "enter" && pressed === "enter") return true;
  if (key === "esc" && pressed === "escape") return true;
  if (key === "up" && pressed === "arrowup") return true;
  if (key === "down" && pressed === "arrowdown") return true;
  if (key === "left" && pressed === "arrowleft") return true;
  if (key === "right" && pressed === "arrowright") return true;
  return false;
}

export function useHotkey(
  pattern: string | string[],
  handler: HotkeyHandler,
  opts: HotkeyOptions = {},
): void {
  const enabled = opts.enabled ?? true;
  const allowInEditable = opts.allowInEditable ?? false;
  const preventDefault = opts.preventDefault ?? true;
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;

  const patternKey = Array.isArray(pattern) ? pattern.join("|") : pattern;

  React.useEffect(() => {
    if (!enabled) return;
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    const onKey = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (!allowInEditable && isEditableInPath(ke)) return;

      for (const p of patterns) {
        if (matches(p, ke)) {
          const out = handlerRef.current(ke);
          // Handler can return false to bail out ("didn't handle, let native
          // handle it") — important for Escape when no menu is open.
          if (out === false) return;
          if (preventDefault) ke.preventDefault();
          ke.stopPropagation();
          return;
        }
      }
    };

    // Capture phase on document so we intercept before inputs / Radix primitives.
    document.addEventListener("keydown", onKey as EventListener, true);
    return () => document.removeEventListener("keydown", onKey as EventListener, true);
  }, [enabled, allowInEditable, preventDefault, patternKey]);
}
