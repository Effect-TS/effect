---
"effect": minor
---

Add `McpServer.visibility` to hide tools, resources and prompts per request based on services provided by MCP middleware. Middleware that wraps a visibility now runs on list requests and receives `MiddlewareListOptions` with `targets`, so `MiddlewareOptions` is a union to narrow on `method`. Middleware provided both locally and globally now runs once.
