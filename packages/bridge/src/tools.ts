import type { Selection, SelectionSummary } from "@chrome-to-claude/shared";
import {
  clearAll,
  getLatest,
  getSelection,
  listPending,
  markApplied,
  markDelivered,
} from "./mcp-client.ts";

export type McpTextContent = { type: "text"; text: string };
export type McpImageContent = { type: "image"; data: string; mimeType: string };
export type McpContent = McpTextContent | McpImageContent;

export type McpToolResult = {
  content: McpContent[];
  isError?: boolean;
};

function formatSummary(s: SelectionSummary): string {
  const parts = [
    `id: ${s.id}`,
    `status: ${s.status}`,
    `created: ${new Date(s.createdAt).toISOString()}`,
    `url: ${s.url}`,
  ];
  if (s.componentName) parts.push(`component: ${s.componentName}`);
  if (s.sourceFile) parts.push(`source: ${s.sourceFile}`);
  parts.push(`prompt: ${s.prompt}`);
  return parts.join("\n");
}

function formatSelection(s: Selection): string {
  const lines: string[] = [];
  lines.push(`# Browser selection ${s.id}`);
  lines.push(`Status: ${s.status}`);
  lines.push(`Created: ${new Date(s.createdAt).toISOString()}`);
  lines.push(`URL: ${s.url}`);
  lines.push(`Page title: ${s.title}`);
  lines.push("");
  lines.push(`## User prompt`);
  lines.push(s.prompt || "(no prompt)");
  lines.push("");
  lines.push(`## Element`);
  lines.push(`- tag: ${s.tagName}`);
  if (s.idAttr) lines.push(`- id: ${s.idAttr}`);
  if (s.classes.length) lines.push(`- classes: ${s.classes.join(" ")}`);
  lines.push(`- selector: ${s.selector}`);
  lines.push(
    `- bounding box: ${s.boundingBox.x},${s.boundingBox.y} ${s.boundingBox.w}×${s.boundingBox.h}`,
  );
  if (s.textContent) {
    lines.push(`- text: ${JSON.stringify(s.textContent.slice(0, 200))}`);
  }
  if (s.outerHTML) {
    lines.push("");
    lines.push("## outerHTML (truncated)");
    lines.push("```html");
    lines.push(s.outerHTML);
    lines.push("```");
  }
  lines.push("");
  lines.push("## Framework");
  if (s.framework.type === "none") {
    lines.push("- none detected (production build or non-framework page)");
    lines.push("- fall back to grep by selector / class / text above");
  } else {
    lines.push(`- type: ${s.framework.type}`);
    if (s.framework.componentName) lines.push(`- component: ${s.framework.componentName}`);
    if (s.framework.sourceFile) {
      const loc =
        s.framework.sourceLine != null
          ? `${s.framework.sourceFile}:${s.framework.sourceLine}`
          : s.framework.sourceFile;
      lines.push(`- source: ${loc}`);
    }
    if (s.framework.props && Object.keys(s.framework.props).length) {
      lines.push(`- props: ${JSON.stringify(s.framework.props, null, 2)}`);
    }
  }
  if (s.styleDelta.length) {
    lines.push("");
    lines.push("## Style edits requested (delta)");
    for (const d of s.styleDelta) {
      const bang = d.important ? " !important" : "";
      lines.push(`- ${d.property}: ${d.oldValue} → ${d.newValue}${bang}`);
    }
  }
  if (s.computedStyles && Object.keys(s.computedStyles).length) {
    lines.push("");
    lines.push("## Computed styles (snapshot at pick time)");
    const entries = Object.entries(s.computedStyles).sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of entries) {
      lines.push(`- ${k}: ${v}`);
    }
  }
  return lines.join("\n");
}

function selectionContent(s: Selection, markErr?: string | null): McpContent[] {
  const parts: string[] = [formatSelection(s)];
  if (markErr) {
    // Don't fail the call, but tell Claude the queue state may be stale so
    // it can suggest the user call `mark_applied` manually or retry.
    parts.push(
      "\n---\n**Note:** failed to mark this selection as delivered on the bridge " +
        `(${markErr}). The queue may still show it as pending.`,
    );
  }
  const content: McpContent[] = [{ type: "text", text: parts.join("\n") }];
  if (s.screenshotPng) {
    content.push({
      type: "image",
      data: s.screenshotPng,
      mimeType: "image/png",
    });
  }
  return content;
}

async function tryMarkDelivered(id: string): Promise<string | null> {
  try {
    await markDelivered(id);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mcp] markDelivered(${id}) failed:`, message);
    return message;
  }
}

export const toolDefinitions = [
  {
    name: "list_pending_selections",
    description:
      "List DOM element selections queued by the Chrome extension that have not yet been applied. " +
      "Use when the user asks what browser edits are pending, or to find a specific one by id.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_selection",
    description:
      "Fetch the full details of a queued browser selection by id: element identity, framework-detected " +
      "component + source file, style-delta, computed styles, outerHTML, screenshot, and the user's prompt.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Selection id (from list_pending_selections)." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_latest_selection",
    description:
      "Fetch the most recently queued pending selection in full. Use for one-shot prompts like " +
      "'apply my last browser edit'. Automatically marks the selection as delivered.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "mark_applied",
    description:
      "Mark a queued selection as applied — call this after you have edited the source code for it, " +
      "so it stops showing up as pending.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "clear_browser_queue",
    description: "Delete all queued browser selections. Destructive — only use when the user asks.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
] as const;

export async function runTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
  try {
    switch (name) {
      case "list_pending_selections": {
        const pending = await listPending();
        if (pending.length === 0) {
          return { content: [{ type: "text", text: "No pending browser selections." }] };
        }
        const text = pending.map(formatSummary).join("\n\n---\n\n");
        return { content: [{ type: "text", text }] };
      }
      case "get_selection": {
        const id = String(args.id ?? "");
        if (!id) return errorResult("missing required 'id'");
        const sel = await getSelection(id);
        if (!sel) return errorResult(`no selection found with id ${id}`);
        const markErr = await tryMarkDelivered(id);
        return { content: selectionContent(sel, markErr) };
      }
      case "get_latest_selection": {
        const sel = await getLatest();
        if (!sel) {
          return {
            content: [
              {
                type: "text",
                text: "No pending browser selections. Pick an element in Chrome and send it first.",
              },
            ],
          };
        }
        const markErr = await tryMarkDelivered(sel.id);
        return { content: selectionContent(sel, markErr) };
      }
      case "mark_applied": {
        const id = String(args.id ?? "");
        if (!id) return errorResult("missing required 'id'");
        await markApplied(id);
        return { content: [{ type: "text", text: `marked ${id} as applied` }] };
      }
      case "clear_browser_queue": {
        const removed = await clearAll();
        return { content: [{ type: "text", text: `cleared ${removed} selections` }] };
      }
      default:
        return errorResult(`unknown tool: ${name}`);
    }
  } catch (err) {
    return errorResult(String(err instanceof Error ? err.message : err));
  }
}

function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
