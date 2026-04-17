// Runs in the page's MAIN world so it can read expando properties set by
// framework dev runtimes (React fibers, Vue component handles, Svelte meta).
// The isolated-world content script dispatches a synchronous CustomEvent
// tagged with a data-attribute; this script looks up the element, reads the
// fiber, and dispatches a result event.

import type { FrameworkInfo } from "@chrome-to-claude/shared";

type AnyRecord = Record<string, unknown>;

const REQUEST_EVENT = "c2c:detect";
const RESULT_EVENT = "c2c:detect:result";
const TAG_ATTR = "data-c2c-detect";

function displayNameOfType(type: unknown): string | undefined {
  if (!type) return undefined;
  if (typeof type === "string") return type;
  const t = type as AnyRecord;
  if (typeof t.displayName === "string") return t.displayName;
  if (typeof t.name === "string") return t.name;
  const render = t.render as AnyRecord | undefined;
  if (render?.displayName) return String(render.displayName);
  if (render?.name) return String(render.name);
  return undefined;
}

function sanitizeProps(props: unknown, depth = 0): Record<string, unknown> | undefined {
  if (!props || typeof props !== "object") return undefined;
  if (depth > 1) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props as AnyRecord)) {
    if (k === "children") continue;
    if (typeof v === "function") {
      out[k] = `[fn ${(v as { name?: string }).name || "anonymous"}]`;
    } else if (v && typeof v === "object") {
      out[k] = "[object]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

function getReactFiber(el: Element): AnyRecord | null {
  const keys = Object.keys(el);
  const key = keys.find((k) => k.startsWith("__reactFiber$"));
  if (!key) return null;
  return (el as unknown as AnyRecord)[key] as AnyRecord | null;
}

function detectReact(el: Element): FrameworkInfo | null {
  const fiber = getReactFiber(el);
  if (!fiber) return null;
  let cur: AnyRecord | null = fiber;
  let componentName: string | undefined;
  let sourceFile: string | undefined;
  let sourceLine: number | undefined;
  let sourceColumn: number | undefined;
  let props: Record<string, unknown> | undefined;

  while (cur) {
    const type = cur.type;
    const dbg = (cur._debugSource ?? null) as
      | { fileName?: string; lineNumber?: number; columnNumber?: number }
      | null;

    if (typeof type !== "string" && type) {
      if (!componentName) componentName = displayNameOfType(type);
      if (!props) props = sanitizeProps(cur.memoizedProps ?? cur.pendingProps);
    }
    if (dbg?.fileName && !sourceFile) {
      sourceFile = dbg.fileName;
      sourceLine = dbg.lineNumber;
      sourceColumn = dbg.columnNumber;
    }
    if (componentName && sourceFile) break;
    cur = (cur.return as AnyRecord | undefined) ?? null;
  }

  if (!componentName && !sourceFile) return { type: "react" };
  return { type: "react", componentName, sourceFile, sourceLine, sourceColumn, props };
}

function detectVue(el: Element): FrameworkInfo | null {
  const anyEl = el as unknown as AnyRecord;
  const v3 = anyEl.__vueParentComponent as AnyRecord | undefined;
  if (v3) {
    const type = (v3.type ?? {}) as AnyRecord;
    const proxyOptions = v3.proxy
      ? ((v3.proxy as AnyRecord).$options as AnyRecord | undefined)
      : undefined;
    const componentName =
      (type.name as string | undefined) ??
      (type.__name as string | undefined) ??
      (proxyOptions?.name as string | undefined);
    const sourceFile = type.__file as string | undefined;
    return {
      type: "vue",
      componentName,
      sourceFile,
      props: sanitizeProps(v3.props),
    };
  }
  const v2 = anyEl.__vue__ as AnyRecord | undefined;
  if (v2) {
    const opts = (v2.$options ?? {}) as AnyRecord;
    return {
      type: "vue",
      componentName: opts.name as string | undefined,
      sourceFile: opts.__file as string | undefined,
      props: sanitizeProps(v2.$props),
    };
  }
  return null;
}

function detectSvelte(el: Element): FrameworkInfo | null {
  const anyEl = el as unknown as AnyRecord;
  const meta = anyEl.__svelte_meta as AnyRecord | undefined;
  if (!meta) return null;
  const loc = meta.loc as { file?: string; line?: number; column?: number } | undefined;
  return {
    type: "svelte",
    sourceFile: loc?.file,
    sourceLine: loc?.line,
    sourceColumn: loc?.column,
  };
}

function detect(el: Element): FrameworkInfo {
  return (
    detectReact(el) ??
    detectVue(el) ??
    detectSvelte(el) ?? { type: "none" }
  );
}

window.addEventListener(REQUEST_EVENT, (event) => {
  const detail = (event as CustomEvent<{ tag?: string }>).detail;
  const tag = detail?.tag;
  if (!tag) return;
  const el = document.querySelector(`[${TAG_ATTR}="${CSS.escape(tag)}"]`);
  const info = el ? detect(el) : { type: "none" as const };
  window.dispatchEvent(
    new CustomEvent(RESULT_EVENT, { detail: { tag, info } }),
  );
});
