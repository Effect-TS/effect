---
"effect": minor
---

Add `sessionMode: "stateless"` to `McpServer.layerHttp`, serving legacy Streamable HTTP clients without `Mcp-Session-Id` so each request may reach any server instance.
