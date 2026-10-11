---
"effect": patch
---

Add `McpServer.layerHttp({ mode: "request" })` for serverless hosts such as Cloudflare Workers. Each POST is served by an MCP server owned by that request, so no fiber or timer outlives the request. Request mode supports sessionless protocols such as `v2026_07_28` and rejects subscriptions and session termination.
