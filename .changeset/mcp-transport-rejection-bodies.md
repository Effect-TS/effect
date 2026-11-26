---
"effect": patch
---

Answer `McpServer.layerHttp` transport rejections with a JSON-RPC error that says what to change, instead of an empty body: a disallowed `Origin` (403), a `Content-Type` other than `application/json` (415), an `Accept` header without both media types (406), an unknown `MCP-Session-Id` (404) and a refused batch (400). The unsupported protocol version message also lists the supported versions.
