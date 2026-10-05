---
"effect": patch
---

Add `allowSessionTermination` to `McpServer.layerHttp`. When set, a DELETE with an `Mcp-Session-Id` ends that session (`204`), and later requests with the id get `404` so the client re-initializes. Without it, DELETE still returns `405`.
