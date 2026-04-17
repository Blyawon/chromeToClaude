import type { StyleDelta } from "@chrome-to-claude/shared";

export const EDITABLE_PROPERTIES = [
  "color",
  "background-color",
  "background",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-transform",
  "text-decoration",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "flex-direction",
  "align-items",
  "justify-content",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "border",
  "border-color",
  "border-width",
  "border-style",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "box-shadow",
  "cursor",
  "transform",
  "transition",
];

export function snapshotComputed(el: Element): Record<string, string> {
  const cs = getComputedStyle(el as HTMLElement);
  const out: Record<string, string> = {};
  for (const prop of EDITABLE_PROPERTIES) {
    const v = cs.getPropertyValue(prop);
    if (v) out[prop] = v.trim();
  }
  return out;
}

export class InlineStyleOverlay {
  private saved = new Map<string, string>();

  constructor(private el: HTMLElement) {}

  set(property: string, value: string, important = false): void {
    if (!this.saved.has(property)) {
      this.saved.set(property, this.el.style.getPropertyValue(property));
    }
    this.el.style.setProperty(property, value, important ? "important" : "");
  }

  revertAll(): void {
    for (const [prop, oldVal] of this.saved) {
      if (oldVal) this.el.style.setProperty(prop, oldVal);
      else this.el.style.removeProperty(prop);
    }
    this.saved.clear();
  }
}

export function computeDelta(
  baseline: Record<string, string>,
  edited: Record<string, string>,
  important: (prop: string) => boolean = () => false,
): StyleDelta {
  const delta: StyleDelta = [];
  for (const [prop, newValue] of Object.entries(edited)) {
    const oldValue = baseline[prop] ?? "";
    if (oldValue.trim() === newValue.trim()) continue;
    delta.push({
      property: prop,
      oldValue,
      newValue,
      important: important(prop),
    });
  }
  return delta;
}
