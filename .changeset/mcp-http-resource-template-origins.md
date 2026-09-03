---
"effect": patch
---

Fix HTTP and HTTPS resource templates registered with `McpServer.registerResource` failing to resolve. Templates with different hosts or schemes remain distinct.
