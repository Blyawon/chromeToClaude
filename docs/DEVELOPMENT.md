# Development guide

How to hack on chromeToClaude: dev loop, debugging, typechecks, and the
extension points for adding new features.

- [Prerequisites](#prerequisites)
- [Project layout](#project-layout)
- [Dev loop](#dev-loop)
- [Typechecks and builds](#typechecks-and-builds)
- [Debugging](#debugging)
  - [Daemon](#daemon)
  - [Service worker](#service-worker)
  - [Content scripts](#content-scripts)
  - [Inspector React app](#inspector-react-app)
  - [MCP stdio shim](#mcp-stdio-shim)
- [Adding a new style section](#adding-a-new-style-section)
- [Adding a new MCP tool](#adding-a-new-mcp-tool)
- [Release process](#release-process)
- [Code review findings (change log)](#code-review-findings-change-log)

---

## Prerequisites

- **Node ≥ 18** (daemon, bridge, MCP shim).
- **npm** (workspaces). `bun` also works if you already use it for the
  root scripts, but is not required.
- **Chrome** with Developer Mode enabled for loading the unpacked
  extension.

No database setup — SQLite is embedded via `better-sqlite3`.

## Project layout

```
packages/
├── shared/                            protocol.ts only — types + validators
│   └── protocol.ts                    imported by bridge + extension
│
├── bridge/                            Node daemon + MCP stdio shim
│   ├── bin/chrome-to-claude.mjs       bin entry (tsx-loads src/cli.ts)
│   └── src/
│       ├── cli.ts                     `start | status | pair | rotate | clear | mcp`
│       ├── daemon.ts                  lifecycle, signals, PID file
│       ├── http.ts                    HTTP routing, CORS, auth gates
│       ├── queue.ts                   SQLite: enqueue / list / setStatus / sweep
│       ├── auth.ts                    token rotate + verify + origin check
│       ├── tools.ts                   MCP tool definitions + formatting
│       ├── mcp-stdio.ts               stdio server (spawned by each Claude)
│       ├── mcp-client.ts              HTTP client used by the MCP shim
│       └── paths.ts                   ~/.chrome-to-claude/* path helpers
│
└── extension/                         Vite + @crxjs Manifest V3 extension
    ├── manifest.config.ts             crxjs manifest definition
    ├── vite.config.ts                 build config
    ├── tailwind.config.ts             design tokens
    └── src/
        ├── background.ts              service worker (token, fetch, screenshot)
        ├── options/                   pairing options page
        ├── content/
        │   ├── framework-main.ts      runs in page main world — reads fibers
        │   ├── framework.ts           isolated-world bridge to framework-main
        │   ├── index.ts               mounts picker + inspector on toggle
        │   ├── picker.ts              crosshair overlay + hover highlight
        │   ├── inspector.ts           mounts React into a closed shadow root
        │   ├── selector.ts            build CSS selector for an element
        │   ├── styles.ts              snapshotComputed + InlineStyleOverlay
        │   └── transport.ts           sendMessage wrappers with timeouts
        └── ui/
            ├── App.tsx                top-level layout
            ├── state.ts               useInspectorStore (all domain logic)
            ├── index.css              Tailwind entry
            ├── lib/                   hotkeys, colors, history, math, …
            ├── primitives/            PropertyInput, ColorField, Select, …
            ├── components/            Header, DaemonBanner, QueueList, …
            │   └── sections/          PositionSection, LayoutSection, …
            └── ui/                    low-level primitives (button, tooltip, …)
```

## Dev loop

Open **three terminals**.

**Terminal 1 — bridge in watch mode**

```bash
npm run dev:bridge
# uses tsx to hot-reload src/cli.ts start
```

Edits to any bridge source file restart the daemon automatically. Your
queue is persistent (SQLite) so you don't lose selections across restarts.

**Terminal 2 — extension in watch mode**

```bash
npm run dev:extension
# vite build --watch --mode development
```

Produces `packages/extension/dist/` on every change. With the extension
already loaded unpacked, Chrome picks up the rebuild automatically. For
content-script-only changes, reload the current tab; for service-worker
or manifest changes, hit the refresh arrow on `chrome://extensions`.

**Terminal 3 — Claude client**

```bash
claude  # CLI
# ...then invoke tools in your conversation
```

The MCP shim is spawned on demand by Claude, using the daemon from
terminal 1. No separate restart needed.

## Typechecks and builds

```bash
# Strict typechecks
cd packages/bridge    && npx tsc --noEmit
cd packages/extension && npx tsc --noEmit

# Production extension build (what you load in chrome://extensions)
npm run build:extension

# Both
npm run build
```

There's currently **no test suite** — see [USAGE.md](USAGE.md) for manual
smoke tests. High-leverage test candidates (from the review) are listed
at the bottom of [this doc](#code-review-findings-change-log).

## Debugging

### Daemon

It logs to its stdout:

- `[bridge] listening on http://127.0.0.1:47823` on startup
- `[bridge] token: …` on startup and after every `rotate`
- `[bridge] server error: …` on any handled exception (with full stack)
- `[mcp] markDelivered(id) failed: …` when a mark-delivered HTTP call
  fails (usually because the daemon went down between tool calls)

To reproduce a specific request by hand:

```bash
TOKEN=$(cat ~/.chrome-to-claude/token)
curl -H "x-auth-token: $TOKEN" http://127.0.0.1:47823/health
curl -H "x-auth-token: $TOKEN" http://127.0.0.1:47823/queue
curl -H "x-auth-token: $TOKEN" http://127.0.0.1:47823/latest
```

SQLite is inspectable from the shell:

```bash
sqlite3 ~/.chrome-to-claude/queue.db '.schema'
sqlite3 ~/.chrome-to-claude/queue.db 'SELECT id, status, created_at FROM selections ORDER BY created_at DESC LIMIT 10;'
```

### Service worker

On `chrome://extensions`, open the extension's **Service worker**
DevTools link. Logs from `background.ts` (and any unhandled promise
rejections from the SW context) appear here.

`console.debug` output from screenshot capture / crop failures requires
you to enable **Verbose** log level.

If the SW appears "inactive", Chrome has torn it down — any live
`onMessage` listener re-registers on the next event. You shouldn't need
to do anything; just keep using the extension.

### Content scripts

Regular page DevTools → **Console**. Both content scripts run in that
tab:

- The **isolated world** script logs appear under `top` + the
  extension's bundle URL.
- The **main world** script (`framework-main.ts`) shares the page's
  global console, so its logs appear with the page's source.

To inspect selector / framework output quickly:

```js
// In the page console (DevTools):
document.querySelector('your-selector').__reactFiber$...   // main-world only
```

In the isolated-world script, you can temporarily expose:

```ts
// content/index.ts (do NOT commit this)
(window as any).__c2c = { picker, inspector };
```

### Inspector React app

The React DevTools extension works *if* the inspector's shadow root is
"open". It's currently **closed** (for isolation), so React DevTools
won't pierce it.

Temporary hack for local debugging: change
[`inspector.ts`](../packages/extension/src/content/inspector.ts)'s
`attachShadow({ mode: "closed" })` to `"open"`. React DevTools will
connect. Don't commit that.

Console logging inside the React app goes to the page console (same
content-script context).

### MCP stdio shim

Set `ANTHROPIC_LOG=debug` (Claude CLI) or look at the Claude client's
MCP server log panel. The shim prints `[mcp-stdio] fatal: …` on
uncaught errors. Normal tool calls don't log anything — they're
request/response over stdin/stdout JSON-RPC.

To run the shim interactively (useful for manual protocol inspection):

```bash
npx chrome-to-claude mcp
# Then paste MCP JSON-RPC frames on stdin, one per line.
# {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

## Adding a new style section

Style sections live in
[`packages/extension/src/ui/components/sections/`](../packages/extension/src/ui/components/sections/).
Each one takes the same
[`SectionBaseProps`](../packages/extension/src/ui/components/sections/types.ts)
(`values`, `baseline`, `onChange`, `onCommit`, `onReset`) and renders a
`<Section>` with property inputs.

Minimum steps to add one (e.g. a new "Transitions" section):

1. List the CSS properties you want to expose in
   [`content/styles.ts`](../packages/extension/src/content/styles.ts)'s
   `EDITABLE_PROPERTIES`. These are snapshot-read by
   `snapshotComputed()` — if the property isn't in that list, the
   inspector won't see it.
2. Create `components/sections/TransitionsSection.tsx`. Copy the shape
   from `EffectsSection.tsx` as a starting point. Use primitives:
   - `<PropertyInput>` for numeric / unit values.
   - `<ColorField>` for color values.
   - `<Select>` for enumerated choices.
   - `<IconToggleButton>` for boolean toggles.
3. Import and render it in
   [`App.tsx`](../packages/extension/src/ui/App.tsx) inside the
   `<SectionErrorBoundary>`.

All edits are auto-applied via `InlineStyleOverlay`; the store handles
undo/redo, reset, and the "Include all edits in prompt" aggregator
automatically.

## Adding a new MCP tool

MCP tools are defined in
[`packages/bridge/src/tools.ts`](../packages/bridge/src/tools.ts).
To add one:

1. Append to `toolDefinitions` (`name`, `description`, `inputSchema`).
   Keep the description oriented at *when* Claude should call it — the
   LLM matches intent to descriptions.
2. Add a `case "<your-tool>": …` in `runTool`. Coerce and validate any
   `args` fields defensively — MCP clients may send malformed shapes.
3. If your tool needs to call the daemon, extend
   [`mcp-client.ts`](../packages/bridge/src/mcp-client.ts) with a new
   method that hits a new HTTP endpoint on the daemon.
4. If you added a new HTTP endpoint, wire it in
   [`http.ts`](../packages/bridge/src/http.ts) with the correct gate
   (`gateExtension` for writes from the extension, `gateLoopback` for
   reads/writes from the MCP shim and CLI).

Return shape:

```ts
type McpToolResult = {
  content: (McpTextContent | McpImageContent)[];
  isError?: boolean;
};
```

Set `isError: true` for structured failures so the Claude client
surfaces them as tool errors rather than text.

## Release process

This repo isn't on npm yet — usage is "clone and run". If you're
considering publishing:

1. Bump `version` in
   [`packages/bridge/package.json`](../packages/bridge/package.json)
   and `VERSION` in [`http.ts`](../packages/bridge/src/http.ts) in
   the same commit. The HTTP `/health` exposes `version`.
2. Run `npm run build` from repo root — produces `packages/extension/dist/`
   and typechecks the bridge.
3. Tag `v0.x.y` and draft a GitHub release with the extension zip
   attached.
4. Publish `chrome-to-claude` (the bridge) to npm:
   `cd packages/bridge && npm publish`.

## Code review findings (change log)

The most recent full code review (see commit history) landed these
changes. Kept here as a high-leverage change log and as guidance for
future contributors — if you're fixing similar bugs, these are the
patterns.

**Critical fixes**

- [state.ts:244–291](../packages/extension/src/ui/state.ts#L244-L291) —
  `sendQueue` now snapshots via `queueRef`, tracks sent IDs, and
  reconciles with a functional `setQueue`. Previously, a concurrent
  `addToQueue` during an in-flight send could be clobbered.

**High-priority fixes**

- [tools.ts:190-220](../packages/bridge/src/tools.ts) — `markDelivered`
  errors are logged and surfaced to Claude in the content block rather
  than silently swallowed.
- [auth.ts:33-36](../packages/bridge/src/auth.ts#L33-L36) — extension
  origin must match the 32-char `a-p` format, not just
  `startsWith("chrome-extension://")`.
- [queue.ts](../packages/bridge/src/queue.ts) — retention sweep runs on
  every enqueue; `closeDatabase()` exported and wired into cleanup.
- [http.ts](../packages/bridge/src/http.ts) — `requestTimeout`,
  `headersTimeout`, generic 500 body, UUID validation on
  `/selection/:id` and `/mark-*`, `validateEnqueuePayload` before any
  DB write.
- [background.ts](../packages/extension/src/background.ts) — payload
  no longer mutated; screenshot iteratively downscaled if PNG > 3 MB;
  DPR clamped to `[0.1, 4]`.
- [transport.ts](../packages/extension/src/content/transport.ts) —
  `sendMessage` wrapped with `Promise.race` timeouts (5 s health,
  30 s enqueue) to survive SW teardown.
- [App.tsx](../packages/extension/src/ui/App.tsx) — dropped
  `key={store.generation}` so section collapsible state survives re-picks;
  wrapped sections in `SectionErrorBoundary`; `commands` memo depends on
  destructured callbacks rather than the entire store.
- [hotkeys.ts](../packages/extension/src/ui/lib/hotkeys.ts) — symbol
  keys (like `?`) bypass strict shift check → layout-portable. App now
  uses `"?"` instead of `"shift+/"`.
- [colors.ts](../packages/extension/src/ui/lib/colors.ts) — accepts
  space-separated `rgb()`, percent alpha, and falls back to canvas
  `fillStyle` sentinel-probe for CSS keywords. No DOM side effect on
  the host page.
- [DaemonBanner.tsx](../packages/extension/src/ui/components/DaemonBanner.tsx) —
  `onlineRef` inside the interval; effect only re-runs on `check`.
- [state.ts:277-288](../packages/extension/src/ui/state.ts#L277-L288) —
  `canUndo` / `canRedo` wrapped in `React.useMemo` on `historyVersion`
  for clarity (they always worked, but the previous pattern was
  obscure).

**Medium-priority fixes**

- Runtime validation of stored prefs (
  [persistence.ts](../packages/extension/src/ui/lib/persistence.ts)) —
  corrupt shapes fall back to defaults instead of crashing.
- `SectionErrorBoundary` — a crash in one section keeps the rest of the
  panel usable.
- `CommandPalette` — `role="dialog"`, `aria-modal`, `aria-label`.
- `ColorField` — invalid colors render `—` instead of the raw string.
- `TOKEN_STORAGE_KEY` hoisted to `@chrome-to-claude/shared`.

**Intentionally not done**

- Extracting hooks from `App.tsx` / splitting `state.ts` — these are
  pure refactors. Worth doing, but with tests first.
- Replacing `math.ts`'s `new Function` with a parser — the input is
  whitelisted by regex; the evaluator is bounded; no CSP surprise in
  the extension context.
- Hoisting `z-[2147483647]` to a CSS variable — cosmetic.

**Highest-leverage tests to write first**

1. `lib/colors.ts` round-trip — pure, catches UI regressions cheap.
2. `lib/history.ts` undo / redo / collapse behavior.
3. `state.ts` `sendQueue` race — the Critical above. A failing test
   would have caught it.
4. `bridge/queue.ts` status transitions and retention cutoff.
5. `content/selector.ts` uniqueness across typical DOM shapes.
