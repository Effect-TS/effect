---
"effect": patch
---

Stop sending MCP tool results that encode to `null` or an array as `structuredContent`, which MCP allows only to be a JSON object.
