# Architecture

This document explains how chromeToClaude is put together — the three
processes that cooperate, what they exchange, and why the design looks
the way it does.

- [System overview](#system-overview)
- [Processes and responsibilities](#processes-and-responsibilities)
- [Data flow for a single selection](#data-flow-for-a-single-selection)
- [Wire protocol](#wire-protocol)
- [Data model](#data-model)
- [Security model](#security-model)
- [Framework introspection](#framework-introspection)
- [The React inspector UI](#the-react-inspector-ui)
- [Storage & retention](#storage--retention)
- [Shutdown and recovery](#shutdown-and-recovery)
- [Design decisions](#design-decisions)

---

## System overview

Three processes cooperate to turn a DOM click into a Claude edit:

```
┌──────────────────────────┐         ┌──────────────────────────┐
│ Chrome extension         │         │ Claude (Desktop / CLI /  │
│   • content scripts      │         │         Cursor)          │
│   • background (SW)      │         │                          │
│   • inspector UI (React) │         │  spawns ↓ stdio on demand│
└──────────┬───────────────┘         └──────────┬───────────────┘
           │                                    │
           │ HTTP over loopback                 │ MCP stdio shim
           │ (POST /enqueue, …)                 │ (`chrome-to-claude mcp`)
           ▼                                    ▼
      ┌────────────────────────────────────────────┐
      │  Bridge daemon (`chrome-to-claude start`)  │
      │  HTTP server @ 127.0.0.1:47823             │
      │  SQLite queue in ~/.chrome-to-claude/      │
      └────────────────────────────────────────────┘
```

Key invariants:

- The **daemon is the only stateful component** — the extension and the MCP
  shim are both stateless caches around it.
- All three processes can restart independently; selections persist because
  they're written to SQLite synchronously.
- The **extension cannot talk directly to Claude**, and Claude cannot
  directly talk to the browser. The daemon is the rendezvous point.

## Processes and responsibilities

### Bridge daemon — `packages/bridge`

A Node HTTP server with a SQLite-backed queue. Its only job is to accept
selections from the extension, persist them, and serve them to MCP
clients.

- [src/daemon.ts](../packages/bridge/src/daemon.ts) — lifecycle (start,
  PID file, SIGINT cleanup, DB close).
- [src/http.ts](../packages/bridge/src/http.ts) — HTTP routing, CORS,
  timeouts, payload validation.
- [src/queue.ts](../packages/bridge/src/queue.ts) — SQLite wrapper:
  enqueue, listPending, setStatus, retention sweep.
- [src/auth.ts](../packages/bridge/src/auth.ts) — token rotation +
  `timingSafeEqual` verification + extension-origin format check.
- [src/tools.ts](../packages/bridge/src/tools.ts) — MCP tool definitions
  and formatting of selections as text+image content.
- [src/mcp-stdio.ts](../packages/bridge/src/mcp-stdio.ts) — the shim
  process, stdin/stdout JSON-RPC, spawns as a child of each Claude client.
- [src/mcp-client.ts](../packages/bridge/src/mcp-client.ts) — the HTTP
  client that the MCP shim uses to talk to the daemon.
- [src/cli.ts](../packages/bridge/src/cli.ts) — `start`, `status`,
  `pair`, `rotate`, `clear`, `mcp` commands.
- [src/paths.ts](../packages/bridge/src/paths.ts) — the `~/.chrome-to-claude`
  directory and its files (`token` / `queue.db` / `daemon.pid`).

### Chrome extension — `packages/extension`

A Manifest V3 extension with three runtime contexts:

- **Service worker** ([src/background.ts](../packages/extension/src/background.ts)) —
  owns the token, talks to the daemon, captures screenshots. The
  inspector panel can't hit the network for the daemon directly because
  the loopback origin would be blocked by the page's MIME + CSP posture —
  so everything goes through the SW via `chrome.runtime.sendMessage`.
- **Content script, main world**
  ([src/content/framework-main.ts](../packages/extension/src/content/framework-main.ts)) —
  runs in the page's JS context so it can read React fibers, Vue
  component handles, and Svelte metadata. It only responds to
  `CustomEvent` requests from the isolated world.
- **Content script, isolated world**
  ([src/content/index.ts](../packages/extension/src/content/index.ts))
  mounts the picker + inspector. The picker overlays a highlight box;
  the inspector mounts a React app inside a closed shadow-root so the
  host page's CSS can't bleed in and our CSS can't bleed out.

The inspector React app ([src/ui/App.tsx](../packages/extension/src/ui/App.tsx))
builds a payload locally, then hands it to the SW for network +
screenshot.

### MCP stdio shim — spawned by Claude

`chrome-to-claude mcp` is invoked over stdio by the Claude client. It:

1. Receives MCP JSON-RPC on stdin.
2. For each tool call, HTTP-GETs / POSTs the daemon.
3. Serializes the daemon's JSON response back to the Claude client.

One shim per Claude client; all of them share the same daemon process.

## Data flow for a single selection

```
User clicks the picker crosshair
        │
        ▼
picker.ts captures target → inspector.ts opens the React app
        │
        ▼  [local edits, prompt typed]
App.tsx buildPayload() → EnqueuePayload
        │
        ▼  chrome.runtime.sendMessage({ type: "enqueue", payload, dpr })
background.ts:
  • captureVisibleTab + crop + downscale (if > 3 MB)
  • POST /enqueue with x-auth-token
        │
        ▼
Bridge daemon (http.ts):
  • gateExtension(): verifyOrigin + verifyToken
  • validateEnqueuePayload(): shape + field checks
  • queue.enqueue(): INSERT INTO selections, return id
  • sweepOld(): drop rows > 30d with non-pending status
        │
        ▼  { id: "uuid" }
background.ts → inspector.ts  [toast: "Sent 1 selection"]

…later, user prompts Claude:
        ▼
Claude client → MCP stdio shim → GET /latest (or /selection/:id)
        │
        ▼
Bridge daemon:
  • gateLoopback(): verifyToken (origin optional for loopback)
  • queue.getLatestPending(): full Selection JSON
        │
        ▼
MCP shim formats text + PNG → Claude
```

Marking as `delivered` happens automatically on
`get_selection` / `get_latest_selection`. Marking `applied` is explicit
and Claude-driven.

## Wire protocol

All HTTP bodies are JSON. All requests carry
`x-auth-token: <64 hex chars>`. Origin is enforced on the extension-only
path (`/enqueue`) and optional on loopback calls.

| Method | Path              | Auth             | Body in                                 | Body out                         |
| ------ | ----------------- | ---------------- | --------------------------------------- | -------------------------------- |
| GET    | `/health`         | none             | –                                       | `{ ok, version, queueSize }`     |
| POST   | `/pair`           | origin only      | –                                       | `{ token }`                      |
| POST   | `/pair/rotate`    | origin only      | –                                       | `{ token }` (fresh)              |
| POST   | `/enqueue`        | origin + token   | `EnqueuePayload`                        | `{ id }` or `400 invalid_payload`|
| GET    | `/queue`          | token            | –                                       | `{ selections: Selection[] }`    |
| GET    | `/latest`         | token            | –                                       | `{ selection: Selection \| null }`|
| GET    | `/selection/:id`  | token            | – (`:id` must be UUID)                  | `{ selection }` or `404`/`400`   |
| POST   | `/mark-applied`   | token            | `{ id }` (UUID)                         | `{ ok }` or `404`/`400`          |
| POST   | `/mark-delivered` | token            | `{ id }` (UUID)                         | `{ ok }` or `404`/`400`          |
| POST   | `/clear`          | token            | –                                       | `{ removed: number }`            |

Protocol is defined in
[`packages/shared/protocol.ts`](../packages/shared/protocol.ts) and
imported by both the bridge and the extension so types stay in lockstep.

Server caps and timeouts:

- `MAX_BODY_BYTES = 20 * 1024 * 1024` — over that, the stream is
  destroyed with `body too large`.
- `server.requestTimeout = 30_000` (30 s total).
- `server.headersTimeout = 10_000` (10 s for headers alone).

## Data model

```ts
type EnqueuePayload = {
  url: string;
  title: string;
  selector: string;                 // preferred-id → testid → class chain
  tagName: string;                  // "div", "button", …
  classes: string[];
  idAttr: string | null;
  textContent: string;              // truncated to 500
  outerHTML: string;                // truncated to 2000
  boundingBox: { x, y, w, h };
  screenshotPng: string | null;     // base64, ≤ 3 MB target
  framework: FrameworkInfo;         // { type: "none" } if undetectable
  computedStyles: Record<string, string>;
  styleDelta: StyleDeltaEntry[];    // only properties that changed
  prompt: string;
};

type Selection = EnqueuePayload & {
  id: string;                       // UUID, assigned by daemon
  createdAt: number;                // ms since epoch
  status: "pending" | "delivered" | "applied" | "cancelled";
};
```

`validateEnqueuePayload` in
[`packages/shared/protocol.ts`](../packages/shared/protocol.ts) is a
hand-rolled, no-dep runtime validator the bridge applies before insert.
It rejects missing / mis-typed required fields and returns a precise
reason in the 400 body.

## Security model

chromeToClaude runs entirely on the user's machine and is designed around
the assumption that the local user is trusted but other processes on the
same machine are **not**. The threat model is "a background process tries
to dump your browser queue" and "a rogue page tries to talk to the
daemon."

### Loopback-only

The daemon binds `127.0.0.1`. Nothing routable; no LAN exposure.

### Token auth

- At startup (and on `rotate`), a fresh 32-byte cryptographic token is
  written to `~/.chrome-to-claude/token` with mode `0600`. The token is
  echoed to stdout so the user can pair manually if needed.
- Every authenticated request carries `x-auth-token`. The daemon compares
  it with `timingSafeEqual` (constant-time) — no early return on mismatch.
- The CLI re-reads the token from disk each time; the daemon caches it in
  memory to avoid touching disk on every request.

### Origin gate for extension requests

`POST /enqueue` is only accepted if the request's `Origin` header matches
`^chrome-extension://[a-p]{32}/?$`. This is a format check — it doesn't
pin a specific extension ID (we can't, since we don't know it at daemon
build time) — but it blocks any non-extension process from forging an
extension-style origin.

CORS-wise, the daemon only echoes back origins that pass the
extension-ID check; anything else gets `access-control-allow-origin:
null`, which Chrome will block.

### Payload validation

Every `POST /enqueue` body is checked against `validateEnqueuePayload`
before it touches SQLite. Malformed bodies return `400 invalid_payload`
with a reason — no DB row is created.

### 500 response body

The daemon logs full error detail locally (`console.error`) but returns
only `{ error: "internal" }` to the HTTP caller — no stack traces or
SQLite error text leaks to whoever's polling.

### UUID validation on path parameters

`/selection/:id`, `/mark-applied`, and `/mark-delivered` all verify that
the `id` is a well-formed UUID before querying SQLite. SQL is
parameterized anyway, but this gives a clean 400 for bogus input.

### No network egress beyond loopback

Nothing from the daemon, extension, or MCP shim hits the public internet.
Screenshots, prompts, and selectors stay on the machine.

## Framework introspection

The extension identifies React / Vue / Svelte components by reading
framework-specific expando properties on DOM nodes. These are only
accessible from the page's main JS world, not from content scripts —
so the extension uses **two content scripts** that bridge via
`CustomEvent`.

```
Isolated world                    Main world
──────────────                    ──────────
detectFramework(el) called
        │
        ▼
el.setAttribute(TAG_ATTR, uuid)
        │
        ▼
window.dispatchEvent(             ←→ listener in framework-main.ts
  CustomEvent("c2c:detect",             • document.querySelector([TAG_ATTR=uuid])
               detail:{ tag }))         • reads el.__reactFiber$… / __vueParentComponent / __svelte_meta
        │                               • dispatches CustomEvent("c2c:detect:result",
        ▼                                                          detail:{ tag, info })
listener receives result
        │
        ▼
removeAttribute, return info
```

The round trip is synchronous: both worlds share DOM events, so
`dispatchEvent` executes listeners on all registered targets in the same
microtask.

Framework-specific readers
([framework-main.ts](../packages/extension/src/content/framework-main.ts)):

- **React** — walks `_reactFiber$…` up via `fiber.return` until it finds a
  `type` that isn't a string (i.e., a component, not a host element), and
  a `_debugSource` with a `fileName`. Returns
  `{ componentName, sourceFile, sourceLine, sourceColumn, props }`.
- **Vue 3** — reads `el.__vueParentComponent`, grabs `type.name` /
  `type.__file`. Vue 2 fallback via `el.__vue__`.
- **Svelte** — reads `el.__svelte_meta.loc` for `{ file, line, column }`.

All three drop silently back to `{ type: "none" }` when the required
expandos aren't present (i.e., production bundles).

## The React inspector UI

The inspector runs in a **closed shadow-root** mounted on the host page:

- `inspector.ts` creates `<div data-chrome-to-claude>`, attaches a closed
  shadow root, appends a `<style>` with the Tailwind-built CSS as inline
  text, then mounts React into a `#mount` div. A sibling `#portal-root`
  is appended so tooltips, popovers, the command palette, and modal
  overlays can portal into the shadow root instead of `document.body`.
- `App.tsx` is the top-level layout: draggable / resizable panel, header,
  daemon banner, queue list, prompt, element meta, then the six style
  sections. State lives in `useInspectorStore` ([ui/state.ts](../packages/extension/src/ui/state.ts)).
- The store owns: target element, baseline computed styles, current
  edited values, undo/redo history, the in-memory queue, and the
  `InlineStyleOverlay` that writes to `element.style.*` and reverts on
  target change / unmount.
- Style sections (`PositionSection`, `LayoutSection`, `TypographySection`,
  `FillSection`, `StrokeSection`, `EffectsSection`) are pure props-driven
  components that call `setStyle` / `commitStyle` / `resetStyle` on the
  store.
- The whole section group is wrapped in a `SectionErrorBoundary` so a
  crash in one section doesn't take down the panel.
- A `React.useMemo` exposes `canUndo` / `canRedo` and recomputes on
  every `historyVersion` bump, so buttons stay in sync with the history.
- `sendQueue` snapshots the queue via a ref, tracks which IDs succeeded,
  and reconciles with a functional `setQueue` — so items added during an
  in-flight send aren't clobbered.

## Storage & retention

```
~/.chrome-to-claude/
├── token        (0600, 64 hex chars)
├── daemon.pid   (current PID when daemon is up)
└── queue.db     (SQLite WAL)
```

`queue.db` schema:

```sql
CREATE TABLE selections (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  status     TEXT NOT NULL,            -- pending | delivered | applied | cancelled
  payload    TEXT NOT NULL             -- JSON-encoded Selection
);
CREATE INDEX idx_status_created ON selections(status, created_at DESC);
```

**Retention sweep.** On every `enqueue()`, `sweepOld()` runs:

```sql
DELETE FROM selections
WHERE status IN ('applied', 'delivered', 'cancelled')
  AND created_at < now() - 30 days
```

This keeps the DB bounded without requiring a background cron. Pending
rows are never auto-deleted — only via `/clear`.

## Shutdown and recovery

- `SIGINT` / `SIGTERM` → `cleanup()`:
  1. Delete `daemon.pid`.
  2. `server.close()` (drains in-flight requests).
  3. `closeDatabase()` (triggers SQLite WAL checkpoint).
  4. `process.exit(0)`.
  A 500 ms fallback timer forces exit if close hangs.
- The SW can die at any moment (MV3 lifecycle). The inspector's
  `sendMessage` calls are wrapped in `Promise.race` with 5 s (health) /
  30 s (enqueue) timeouts — the UI always makes forward progress.
- Corrupt `chrome.storage.local` prefs are validated on read and
  degrade to defaults (see
  [ui/lib/persistence.ts](../packages/extension/src/ui/lib/persistence.ts))
  rather than crashing the panel.

## Design decisions

### Why a separate daemon?

The MCP stdio shim is spawned fresh by each Claude client. It can't hold
state across invocations (no filesystem for it, and it dies between
calls). Splitting the daemon out:

- Keeps selections durable between Claude calls.
- Lets one extension feed multiple Claude clients at once.
- Lets the CLI manipulate the queue (`status` / `clear` / `rotate`)
  without needing Claude.
- Isolates extension ↔ Claude failures: if Claude crashes, the queue
  stays; if the extension dies, Claude can still process what's already
  enqueued.

### Why SQLite over in-memory?

- Durability across daemon restarts.
- `better-sqlite3` is synchronous — within a single Node process
  there's no race between read + update.
- Retention sweeps, indexed `status + created_at` lookups, and future
  features (search, pagination) all come for free.

### Why is the picker / inspector in a closed shadow root?

- **CSS isolation both ways.** Host page CSS can't reach in; Tailwind
  classes don't leak out.
- **Event retargeting.** Clicks inside the inspector don't hit the
  host page's event listeners (we rely on this for the prompt
  textarea not triggering site navigation).
- **Closed mode** is a soft defense against the host page trying to
  inspect our state via `host.shadowRoot`.

### Why two content scripts?

Framework expandos (`__reactFiber$`, `__vueParentComponent`,
`__svelte_meta`) are attached to DOM nodes by the page's own JS, which
runs in the "main world". Content scripts by default run in an
"isolated world" — same DOM, different JS globals. Reading expandos
from the isolated world returns nothing.

`framework-main.ts` registers a listener in the main world. The
isolated-world picker / inspector dispatches a `CustomEvent` tagged
with a UUID attribute, the main-world listener resolves the fiber,
and the result comes back via another `CustomEvent`. Synchronous
round-trip, no `postMessage`, no polling.

### Why token auth if the daemon is already loopback-only?

Defense in depth. Any local process on your Mac can hit `127.0.0.1`.
Without a token, every browser extension, curl from a shell, and random
Electron app could read your queue. The token restricts the daemon's
API to "processes that paired first" (i.e. your extension and the MCP
shim that reads the same token file).

### Why are prompts and screenshots sent together?

MCP content blocks can mix text and images. Claude gets both the
machine-readable selection text (selector, component name, style delta)
*and* sees the element visually. Visual context catches cases where the
selector is generic but the element's context (its surroundings,
hierarchy) matters.
