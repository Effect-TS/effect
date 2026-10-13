---
"effect": patch
---

Add `McpServer.layerHttpRequestScoped` for serverless hosts such as Cloudflare Workers. Each POST is served by an MCP server owned by that request, so no fiber or timer outlives the request. The new layer accepts only sessionless protocol adapters such as `v2026_07_28`, with no subscription or session termination options. `McpServer.layerHttp` retains its long-lived server behavior.
