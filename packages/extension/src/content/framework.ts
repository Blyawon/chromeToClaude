import type { FrameworkInfo } from "@chrome-to-claude/shared";

// Framework detection runs in the page's MAIN world (see framework-main.ts)
// because content scripts cannot read React/Vue/Svelte expando properties
// from the isolated world. We bridge synchronously via CustomEvent: both
// worlds share DOM listeners, so dispatch-then-read returns in one tick.

const REQUEST_EVENT = "c2c:detect";
const RESULT_EVENT = "c2c:detect:result";
const TAG_ATTR = "data-c2c-detect";

function randomTag(): string {
  // crypto.randomUUID avoids any collision between overlapping probes.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "c2c-" + crypto.randomUUID();
  }
  return "c2c-" + Math.random().toString(36).slice(2, 10);
}

export function detectFramework(el: Element): FrameworkInfo {
  const tag = randomTag();
  const prior = el.getAttribute(TAG_ATTR);
  el.setAttribute(TAG_ATTR, tag);

  let result: FrameworkInfo = { type: "none" };
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ tag?: string; info?: FrameworkInfo }>).detail;
    if (detail?.tag === tag && detail.info) {
      result = detail.info;
    }
  };

  window.addEventListener(RESULT_EVENT, handler);
  try {
    window.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: { tag } }));
  } finally {
    window.removeEventListener(RESULT_EVENT, handler);
    if (prior != null) el.setAttribute(TAG_ATTR, prior);
    else el.removeAttribute(TAG_ATTR);
  }

  return result;
}
