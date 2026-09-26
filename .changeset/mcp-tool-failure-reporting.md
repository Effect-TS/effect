---
"effect": patch
---

Report MCP tool failures accurately: a declared `Error` failure without a message is now sent as its encoded failure instead of empty text, and an `InternalError` from an `McpServer.addTool` handler is now an `isError` result on 2025-11-25 and `-32603 Internal error` on older revisions, instead of `-32602 Invalid params`.
