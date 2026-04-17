# chromeToClaude

Click any element on any webpage, edit its computed styles live, type a short
instruction, and your active Claude chat picks it up and edits the source
code. An MCP bridge + Chrome extension with live style editing, framework
introspection (React / Vue / Svelte), and a batched queue for turning a
browsing session into a single prompt.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Chrome extension (picker + inspector panel)                          │
│   • hover any element → crosshair highlight                          │
│   • click to select → inspector panel opens                          │
│   • edit computed styles live (typography, layout, fill, stroke, …)  │
│   • type a prompt → Add to queue or Send to Claude                   │
└──────────────────────────────────────────────────────────────────────┘
                         │ POST /enqueue (loopback, token-auth)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Bridge daemon @ 127.0.0.1:47823                                      │
│   • Node HTTP server, SQLite-backed queue                            │
│   • 32-byte hex token, constant-time compared                        │
│   • retention sweep: applied rows > 30 days get dropped              │
└──────────────────────────────────────────────────────────────────────┘
                         ▲ stdio JSON-RPC
                         │
┌──────────────────────────────────────────────────────────────────────┐
│ MCP stdio shim (spawned by each Claude client)                       │
│   list_pending_selections · get_selection · get_latest_selection ·   │
│   mark_applied · clear_browser_queue                                 │
└──────────────────────────────────────────────────────────────────────┘
                         ▲
                         │
                 Claude Desktop / Code / Cursor
```

One daemon serves all Claude clients at once. React fiber introspection
(`_debugSource`), Vue 3 `__vueParentComponent.type.__file`, and Svelte
`__svelte_meta.loc` give Claude the exact component file:line on dev builds.
On production bundles the extension falls back to a stable CSS selector +
outerHTML + screenshot so Claude can still grep.

## Quickstart

Requires Node ≥ 18.

```bash
# 1. Install and start the bridge
git clone https://github.com/Blyawon/chromeToClaude
cd chromeToClaude
npm install
npx chrome-to-claude start

# 2. Build and load the extension (new terminal)
npm run build:extension
# In Chrome: chrome://extensions → Developer mode → Load unpacked
#   → select packages/extension/dist

# 3. Pair the extension with the daemon
# Open the extension's Options page (from chrome://extensions),
# click "Pair with daemon". The token is stored in chrome.storage.local.

# 4. Wire Claude to the MCP server
claude mcp add chrome-to-claude -- npx chrome-to-claude mcp
# (or see docs/USAGE.md for Cursor / Claude Desktop config)
```

Then: click the extension icon (or ⌘⇧E / Ctrl+Shift+E) in any tab, pick an
element, edit styles and/or type a prompt, hit **Send to Claude**, and ask
Claude "apply my last browser edit."

See **[docs/USAGE.md](docs/USAGE.md)** for the full walkthrough, keyboard
shortcuts, and prompt patterns.

## Documentation

- **[docs/USAGE.md](docs/USAGE.md)** — full user guide: installation, the
  inspector UI in detail, picking and editing, queuing, prompt patterns,
  MCP tool reference, troubleshooting.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — system design: how the
  three processes talk, data flow, the wire protocol, security model, how
  framework introspection actually works.
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — dev loop, debugging the
  service worker / content scripts / daemon, the code review findings, and
  how to add a new style section or MCP tool.

## What works, what doesn't

| Case                                        | State  | Notes                                                |
| ------------------------------------------- | ------ | ---------------------------------------------------- |
| React dev builds                            | ✅     | `_debugSource` → exact component file + line         |
| Vue 3 dev builds                            | ✅     | `type.__file` via `__vueParentComponent`             |
| Svelte dev builds                           | ✅     | `__svelte_meta.loc`                                  |
| Production bundles                          | ⚠️     | Stripped source info — selector + outerHTML + shot   |
| Shadow DOM                                  | ⚠️     | Picker pierces via `composedPath`; selector is flat  |
| Iframes                                     | ❌     | v1 only targets the top frame                         |
| CSP-strict sites (GitHub)                   | ⚠️     | Inline styles on shadow host; strict CSP sites work  |
| Claude Desktop / Code CLI / Code in Cursor  | ✅     | Same daemon serves all three                         |

## Security model (summary)

- Daemon binds `127.0.0.1` only. No remote reach.
- Every extension request must carry `Origin: chrome-extension://<id>` where
  `<id>` is a well-formed 32-char `a-p` string, plus a 32-byte hex token in
  `x-auth-token`. Token compare is `timingSafeEqual`.
- Token lives at `~/.chrome-to-claude/token` with mode `0600`.
- Rotating the token via `npx chrome-to-claude rotate` forces the extension
  to re-pair on next request.
- HTTP body is capped at 20 MB; request / headers timeouts at 30 s / 10 s.
- Screenshots are base64 PNGs, iteratively downscaled in the service worker
  to stay under 3 MB. No data ever leaves the loopback socket.

Full details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#security-model).

## Repository layout

```
packages/
  shared/      protocol, types, validators (imported by both sides)
  bridge/      Node daemon + MCP stdio shim (tsx-loaded TypeScript)
  extension/   Vite + @crxjs Chrome MV3 extension (React inspector UI)
docs/          detailed documentation (see above)
```

## License

MIT — do what you want with it.
