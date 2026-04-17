# Usage guide

End-to-end walkthrough for chromeToClaude: install it, pick an element,
edit some styles, queue a batch, and hand the result to Claude.

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Pairing the extension](#pairing-the-extension)
- [Configuring your Claude client](#configuring-your-claude-client)
- [The picker](#the-picker)
- [The inspector panel](#the-inspector-panel)
- [Editing styles](#editing-styles)
- [The prompt and the queue](#the-prompt-and-the-queue)
- [Talking to Claude](#talking-to-claude)
- [MCP tool reference](#mcp-tool-reference)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Common prompt patterns](#common-prompt-patterns)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node ≥ 18** for the bridge daemon and the MCP stdio shim.
- **Google Chrome** (any recent version — Manifest V3).
- **A Claude client** that speaks MCP over stdio: Claude Desktop, Claude
  Code (CLI or Cursor extension), or any other MCP-aware client.

## Installation

```bash
git clone https://github.com/Blyawon/claudeToChrome
cd claudeToChrome
npm install
```

### Start the bridge daemon

```bash
npx chrome-to-claude start
# [bridge] listening on http://127.0.0.1:47823
# [bridge] token: <64 hex chars>
# [bridge] pair the extension via its options page.
```

The daemon is **foreground-only** by design — it writes its token to stdout
and relies on you seeing it. Keep the terminal open, or run under `tmux` /
`pm2` / your launcher of choice if you want it backgrounded.

Other CLI commands:

| Command                     | What it does                                              |
| --------------------------- | --------------------------------------------------------- |
| `chrome-to-claude status`   | Check if the daemon is running, show queue size.          |
| `chrome-to-claude pair`     | Print the current pairing token.                          |
| `chrome-to-claude rotate`   | Rotate the token. The extension must re-pair.             |
| `chrome-to-claude clear`    | Delete all queued selections.                             |
| `chrome-to-claude mcp`      | Run the MCP stdio shim (invoked by Claude, not by you).   |

### Build and load the Chrome extension

```bash
npm run build:extension
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select `packages/extension/dist`.

Pin the extension to the toolbar if you'd like the one-click toggle.

## Pairing the extension

1. On `chrome://extensions`, click **Details** on *chromeToClaude*, then
   **Extension options**. (Or right-click the extension icon →
   **Options**.)
2. Click **Pair with daemon**. The extension calls `POST /pair` on the
   daemon and stores the returned token in `chrome.storage.local`.
3. Click **Ping daemon** to verify. You should see
   `daemon vX.Y.Z, queue: N`.

If pairing fails, the daemon isn't running — start it with
`npx chrome-to-claude start` and retry.

### Rotating the token

```bash
npx chrome-to-claude rotate
```

After a rotate, open the Options page and click **Pair with daemon** again
(or **Rotate & pair**). The old token is invalid immediately — any queued
selections stay intact in the SQLite queue.

## Configuring your Claude client

The daemon holds the queue; each Claude client talks to the daemon via a
**stdio MCP shim** that's spawned on demand. Make sure the daemon is running
*before* you invoke Claude — the shim is just a translator and can't serve
queries on its own.

### Claude Code (CLI)

```bash
claude mcp add chrome-to-claude -- npx chrome-to-claude mcp
```

### Claude Code in Cursor

Create `.cursor/mcp.json` at your project root (or configure via
Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "chrome-to-claude": {
      "command": "npx",
      "args": ["chrome-to-claude", "mcp"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or the equivalent path on your OS:

```json
{
  "mcpServers": {
    "chrome-to-claude": {
      "command": "npx",
      "args": ["chrome-to-claude", "mcp"]
    }
  }
}
```

Restart the Claude client after editing the config.

## The picker

Toggle the picker with:

- the **extension icon** on the Chrome toolbar, or
- **⌘⇧E** (macOS) / **Ctrl+Shift+E** (Windows / Linux).

A crosshair cursor replaces the normal pointer and every element under the
mouse is outlined. Click to select; press **Escape** to cancel.

The picker pierces shadow DOM via `composedPath`, so components rendered
inside shadow roots are pickable. Iframes are **not** supported in v1.

## The inspector panel

Selecting an element opens the inspector panel, anchored to the right edge
of the viewport. It's a floating React app rendered inside a closed
shadow-root — it won't inherit the host page's CSS.

```
┌─────────────────────────────────────────┐
│ Header    · tag · component · ↶ ↷ · ⌘K  │
├─────────────────────────────────────────┤
│ (Daemon banner shown if offline)        │
├─────────────────────────────────────────┤
│ Queue (0–n pending selections)          │
│ Prompt textarea                         │
│ Element meta: selector, source file     │
├─────────────────────────────────────────┤
│ Position  ▸                              │
│ Layout    ▾                              │
│ Typography ▾                             │
│ Fill       ▾                             │
│ Stroke     ▾                             │
│ Effects    ▾                             │
└─────────────────────────────────────────┘
```

- **Drag** the panel header to move it around.
- **Resize** by dragging the left edge of the panel.
- **⌘K** opens a command palette with every action.

Re-pick a new element with the crosshair icon, **⌘⇧E** again, or the
palette's "Pick new element." Section collapse state is preserved across
picks — if you want Layout open by default, open it once and it stays.

## Editing styles

Each property renders as a field specialized for its type:

- **Numeric** inputs (`font-size`, `padding`, `border-radius`, …) — type a
  value, or **drag** the label to scrub, or right-click to cycle through
  `px` / `rem` / `em` / `%`. Arrow keys step by 1; with Shift, by 10; with
  Alt, by 0.1.
- **Color** fields open a picker with recent colors and a gradient
  compositor. Invalid input renders as `—`.
- **Select** fields (weight, align) have keyboard-navigable dropdowns.
- **Alignment pads** for flex/grid items.

**All edits apply live to the page via an inline-style overlay on the
selected element.** They don't leak beyond that element. Closing the
panel restores the original styles.

- **⌘Z** / **⌘⇧Z** (or **⌘Y**) — undo / redo. Rapid edits on the same
  property within 300 ms collapse into a single history entry.
- **"Reset all edits"** (command palette, or ↺ button on a field) reverts
  every edit to the element's baseline computed values.
- **"Include all edits in prompt"** appends a markdown bullet list of
  every changed property to the prompt textarea — handy when you want
  Claude to replicate your visual edits exactly.

## The prompt and the queue

Two ways to push a selection to Claude:

- **Send to Claude** (or **⌘⇧↩**) — immediately enqueues every queued
  selection *plus* the current one (if you have a prompt typed).
- **Add to queue** (or **⌘↩**) — bundle multiple picks into one batch,
  send them together when you're done. Each queued item remembers its
  target element, edits, and prompt.

When you Send:

1. The extension captures a cropped screenshot of the target element
   (downscaled if larger than 3 MB).
2. It POSTs each queued selection to `POST /enqueue` on the daemon with
   the token.
3. The daemon stores each selection in SQLite as `status: "pending"`.
4. The queue clears locally; the panel is ready for the next target.

Selections survive daemon restarts — SQLite is the source of truth.
Applied / delivered rows are swept 30 days after creation.

## Talking to Claude

Once the extension has enqueued your selection, switch to your Claude
client and tell it what to do. Claude is the code-editing half; the bridge
is just a conduit.

A few ways to phrase it:

- **"Apply my last browser edit."** Claude calls `get_latest_selection`,
  gets the full selection (selector, framework info, `file:line`, computed
  styles, style delta, screenshot, your prompt), and edits the source.
- **"What browser edits are pending?"** Claude calls
  `list_pending_selections` and summarizes.
- **"Apply the three selections I just sent in one commit."** Claude
  loops `list_pending_selections` → `get_selection(id)` for each →
  `mark_applied(id)` after editing.
- **"Forget everything in the browser queue."** Claude will ask to
  confirm before calling `clear_browser_queue` (per its instructions:
  destructive).

After Claude finishes, ask it to `mark_applied` the items so they stop
showing up as pending.

## MCP tool reference

| Tool                       | Args                 | What it returns                                                                                         |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `list_pending_selections`  | none                 | Text summary of every pending selection (id, prompt, framework, component name).                        |
| `get_selection`            | `{ id: string }`     | Full context for one selection: text block + cropped PNG. Automatically marks the item as `delivered`.  |
| `get_latest_selection`     | none                 | Same as `get_selection` but for the most recent pending item.                                           |
| `mark_applied`             | `{ id: string }`     | Marks a selection as `applied` (stops showing as pending).                                              |
| `clear_browser_queue`      | none                 | Deletes every queued row. Destructive — Claude will confirm before calling.                             |

The selection text block includes, when available:

```
# Browser selection <uuid>
Status: pending
Created: 2026-04-17T14:32:10.123Z
URL: https://example.com/some/route
Page title: Example site

## User prompt
<your text>

## Element
- tag: <div>
- id: #checkout-cta
- classes: btn btn-primary
- selector: body > main > … > #checkout-cta
- bounding box: 120,240 280×48
- text: "Buy now"

## outerHTML (truncated)
```html
<div id="checkout-cta" class="btn btn-primary">Buy now</div>
```

## Framework
- type: react
- component: CheckoutCTA
- source: src/components/CheckoutCTA.tsx:42
- props: { "variant": "primary", "size": "lg" }

## Style edits requested (delta)
- color: rgb(255, 255, 255) → #0f172a
- background-color: rgb(59, 130, 246) → #f8fafc
- border: none → 1px solid #0f172a

## Computed styles (snapshot at pick time)
- background-color: rgb(59, 130, 246)
- border-radius: 6px
- …
```

Claude receives the PNG as an MCP `image` content block next to the text
block — it can literally see the element in its current state.

## Keyboard shortcuts

| Shortcut            | Action                                          |
| ------------------- | ----------------------------------------------- |
| `⌘⇧E` / `Ctrl+⇧E`   | Toggle picker (global — works outside the app)  |
| `⌘K`                | Open command palette                            |
| `?`                 | Show / hide the shortcut overlay                |
| `⌘↩`                | Add current prompt to queue                     |
| `⌘⇧↩`               | Send everything in the queue to Claude          |
| `⌘Z` / `⌘⇧Z` / `⌘Y` | Undo / redo the last style edit                 |
| `Escape`            | Close command palette / overlay / cancel pick   |

All modifier names here are macOS — on Windows / Linux, `⌘` is `Ctrl`.

## Common prompt patterns

- *Nudge the design, let Claude infer intent.*
  Pick the hero and type: "lighter visual hierarchy; make the subtitle
  the star. No more than two font sizes." Claude sees the element, the
  component file, and the computed styles, and rewrites accordingly.

- *Make your visual edits durable.*
  Edit the styles live until it looks right, tap **Include all edits in
  prompt**, then add a one-liner: "apply exactly these values." Claude
  gets the style delta already formatted as bullets — it can copy
  precise numbers into the source.

- *Batch a whole design pass.*
  Visit the page, pick three elements, each with its own prompt, add
  all to queue, send together. In Claude: "Apply all three pending
  selections in one commit; they're related." Claude reads them as a
  group and can cross-reference (e.g. align spacing across three
  buttons).

- *Just get the selector.*
  Pick, copy selector from the command palette, paste into your grep /
  test. The selector generator prefers `data-testid` > `id` > tag +
  class + `:nth-of-type()` chain.

## Troubleshooting

### "Daemon offline" banner

The inspector polls the daemon every 3 s. If you see the banner:

1. Is the daemon running? `npx chrome-to-claude status`.
2. Any errors in its terminal output?
3. Is port 47823 already in use by something else?
   `lsof -iTCP:47823 -sTCP:LISTEN`.

### 401 "bridge returned 401"

The extension's stored token doesn't match the daemon's. Causes:

- You ran `chrome-to-claude rotate` since last pair.
- You reinstalled the daemon's state folder (`~/.chrome-to-claude`).
- Multiple daemons on different machines somehow reached the same token.

Fix: re-pair from the Options page.

### Picker highlight doesn't appear

Some sites (e.g. very old ones with CSP) can intercept the content script.
Reload the tab after the extension is installed. If the picker still
doesn't engage, open the browser's console and check for errors.

### Claude can't find the source file

- Is the page a **dev build**? Production bundles strip React's
  `_debugSource`, so there's no source info to extract. Claude will use
  the selector + outerHTML + screenshot to grep.
- Is the project using a legacy React compiler without JSX dev
  transform? Check that `@babel/preset-react` has `development: true`
  (via `NODE_ENV=development`) in the page's build config.

### "Chrome saved a screenshot of the wrong area"

Happens when the target element is scrolled off-screen. The background
script captures the **visible** viewport and crops — elements outside
the viewport capture as empty. Scroll the element into view before
sending, or Claude can work from outerHTML + computed styles alone.

### MCP tool call failed with `daemon_offline`

The stdio shim couldn't reach `http://127.0.0.1:47823`. Start the daemon
in another terminal, then retry the tool call. The shim auto-retries the
next call — no Claude restart needed.

### I want to forget everything

```bash
npx chrome-to-claude clear
```

or ask Claude: "Clear the browser queue." It'll confirm first.
