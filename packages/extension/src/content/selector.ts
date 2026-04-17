// Generate a reasonably stable, unique CSS selector for an element.
// Preference order: data-testid > id > a minimal class + nth-of-type chain.

function escapeIdent(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function uniqueInParent(el: Element, selector: string): boolean {
  const parent = el.parentElement ?? el.getRootNode();
  if (!parent) return true;
  const root = parent as ParentNode;
  const matches = root.querySelectorAll(selector);
  return matches.length === 1 && matches[0] === el;
}

function segmentFor(el: Element): string {
  const testid = el.getAttribute("data-testid");
  if (testid) return `[data-testid="${testid.replace(/"/g, '\\"')}"]`;

  if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) {
    return `#${escapeIdent(el.id)}`;
  }

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList)
    .filter((c) => /^[A-Za-z_][\w-]*$/.test(c))
    .slice(0, 3);
  let base = tag + classes.map((c) => `.${escapeIdent(c)}`).join("");

  const parent = el.parentElement;
  if (!parent) return base;

  if (uniqueInParent(el, base)) return base;

  const siblings = Array.from(parent.children).filter(
    (c) => c.tagName === el.tagName,
  );
  if (siblings.length > 1) {
    const idx = siblings.indexOf(el) + 1;
    base += `:nth-of-type(${idx})`;
  }
  return base;
}

export function buildSelector(el: Element): string {
  const path: string[] = [];
  let cur: Element | null = el;
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    const seg = segmentFor(cur);
    path.unshift(seg);
    const joined = path.join(" > ");
    try {
      const root = cur.getRootNode() as Document | ShadowRoot;
      const matches = root.querySelectorAll(joined);
      if (matches.length === 1 && matches[0] === el) return joined;
    } catch {}
    if (seg.startsWith("#") || seg.startsWith("[data-testid")) break;
    cur = cur.parentElement;
    if (path.length > 8) break;
  }
  return path.join(" > ");
}
