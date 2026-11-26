---
"effect": patch
---

Return JSON-RPC error bodies for `McpServer.layerHttp` transport rejections (`403` disallowed `Origin`, `415` `Content-Type`, `406` `Accept`, `404` unknown `MCP-Session-Id`, and `400` refused batches), preserve session and version errors on batch requests, and list supported versions in unsupported-version errors.
