---
"effect": patch
---

Build a fresh `RpcServer.Protocol` for every `McpServer.layerStdio` call. Two stdio servers merged into one layer graph previously shared a single protocol, so only the first one read its `Stdio`.
