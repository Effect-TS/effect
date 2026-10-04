---
"effect": patch
---

Fix `McpSchema.optional` (and the dated MCP wire schemas' helper) refusing to encode a field whose schema decodes to a class, such as the `icons` of an `Implementation`, `Tool`, `Prompt`, `Resource` or `ResourceTemplate`.
