---
"effect": patch
---

Encode tool results with their JSON codec, so a `Schema.Date` or `Schema.BigInt` in a tool result reaches language models, MCP clients and `Chat.exportJson` as JSON.

- `encodedResult` of locally handled tools holds the JSON encoding. A `Schema.Void` result encodes to `null`. Provider-executed tools keep the provider's payload.
- A `Schema.Unknown` result, the `Tool.dynamic` default, must be a JSON value, otherwise the call fails with `ToolResultEncodingError`. Declare a result schema, or use `Schema.Any` to pass other values through unchecked.
