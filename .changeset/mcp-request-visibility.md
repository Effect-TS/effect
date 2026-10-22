---
"effect": minor
---

Add `McpServer.visibility` to hide tools, resources and prompts per request based on services provided by MCP middleware. Middleware that wraps a visibility now runs on list requests, once for each registration, so `MiddlewareMethod` includes the list methods. Middleware provided both locally and globally now runs once.
