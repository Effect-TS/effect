---
"effect": patch
---

Return actionable JSON-RPC error bodies for `McpServer.layerHttp` transport rejections (`403` disallowed `Origin`, `415` unsupported `Content-Type`, `406` unacceptable `Accept`, `404` unknown `MCP-Session-Id`, and `400` refused batches), preserve session/version selection rejections on batch requests, and list supported protocol versions in unsupported-version errors.
