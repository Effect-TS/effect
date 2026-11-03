---
"effect": minor
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Decode tool call parameters with their JSON codec, so a `Schema.Date` parameter accepts an ISO string from MCP clients and language models.

- `Toolkit.WithHandler.handle` takes `Schema.Json` params. Direct callers pass the JSON encoding, with `null` instead of `undefined` for optional parameters.
- With `disableToolCallResolution: true`, tool call `params` hold the JSON encoding and are typed `Schema.Json`. Provider-executed tools keep the provider's payload.
