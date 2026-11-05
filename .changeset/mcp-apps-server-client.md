---
"effect": patch
---

Add MCP Apps support (the `io.modelcontextprotocol/ui` extension) to `McpServer` and `McpClient`.

- New `McpApps` module: `ui://` HTML resources with `McpApps.resource`, the `McpApps.ToolUi` tool annotation for `_meta.ui`, the extension's schemas and `McpApps.isSupported`. The server declares the extension on every protocol revision once an app is registered.
- `McpServer.registerToolkit` sends a tool's `toModelOutput` as the MCP `content`, keeping the encoded result in `structuredContent`.
- `McpServer.resource` accepts `_meta` for its listing entry, and string or byte contents now carry the resource's `mimeType`.
- `McpSchema.McpRequestContext` exposes the JSON-RPC `requestId` and the HTTP `sessionId`.
- `McpClient.make({ extensions: { ui: true } })` declares Apps support, and `McpClient.toolkit` leaves out tools that are visible only to an app.

```ts
import { Effect, Schema } from "effect"
import { McpApps, Tool } from "effect/ai"

const Dashboard = McpApps.resource({
  uri: "ui://dashboard/view.html",
  name: "Dashboard",
  content: Effect.succeed("<!doctype html><html><body>...</body></html>")
})

const ShowDashboard = Tool.make("ShowDashboard", {
  success: Schema.Struct({ count: Schema.Number })
}).annotate(McpApps.ToolUi, { resourceUri: "ui://dashboard/view.html" })
```
