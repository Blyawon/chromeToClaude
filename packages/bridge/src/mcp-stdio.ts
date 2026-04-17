import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { runTool, toolDefinitions } from "./tools.ts";

async function main(): Promise<void> {
  const server = new Server(
    { name: "chrome-to-claude", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions as unknown as Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const result = await runTool(name, (args ?? {}) as Record<string, unknown>);
    return result;
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[mcp-stdio] fatal:", err);
  process.exit(1);
});
