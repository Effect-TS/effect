---
"effect": patch
---

Fix `McpServer` toolkit results whose encoded success is not JSON, such as a `Schema.Void`, `Schema.Date` or `Schema.optional` field, failing `tools/call` with an internal error. `structuredContent` and its text mirror now use the same JSON encoding as the advertised `outputSchema`.
