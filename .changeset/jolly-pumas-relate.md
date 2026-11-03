---
"effect": minor
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Decode tool call parameters from their JSON encoding, so a `Schema.Date` parameter accepts an ISO string from MCP clients and language models.

- `Toolkit.WithHandler.handle` now takes `Schema.Json` params. Direct callers must pass the JSON encoding, using `null` instead of `undefined` for optional parameters.
