---
"effect": patch
---

Encode tool results with their JSON codec, so a `Schema.Date` or `Schema.BigInt` in a tool result reaches language models, MCP clients and `Chat.exportJson` as JSON. Provider-executed tools keep the provider's payload.

### Migration

- A `Tool.dynamic` tool without a `success` schema must return a JSON value, even when `toModelOutput` replaces the model payload. Other values, such as a `Date`, now fail with `ToolResultEncodingError`. Declare a `success` schema, for example `Schema.Date`, or return a JSON value. Declare `success: Schema.Void` for a dynamic tool that returns `undefined`.
- `encodedResult` of a `Schema.Void` tool, including `Tool.make` without a `success` schema, is now `null` instead of `undefined`.
