---
"effect": patch
"@effect/platform-node": patch
---

Add MCP Events (SEP-3415) to `effect/ai/McpServer` with `McpServer.event`, poll and push delivery, and opt-in webhook delivery through `McpServer.layerEventWebhooks` or the SSRF-hardened `NodeMcpServer.layerEventWebhooks`, plus `NetAddress.isGlobal`.
