---
"effect": patch
---

Report declared MCP tool failures with empty messages using their encoded value. Handler execution errors now return `isError` results on protocol version 2025-11-25 and `-32603 Internal error` on older versions, instead of `-32602 Invalid params`.
