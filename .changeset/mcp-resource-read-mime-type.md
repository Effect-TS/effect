---
"effect": patch
---

Fix `McpServer.resource` and `McpServer.registerResource` omitting the registered `mimeType` from `resources/read` contents when the handler returns a string or `Uint8Array`. The type was only listed by `resources/list`, so MCP Apps hosts could not render UI resources served as `text/html;profile=mcp-app`.
