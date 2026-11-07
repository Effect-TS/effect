---
"effect": patch
---

Limit `McpServer` progress to the active request, complete server-closed subscriptions, and drain buffered `RpcServer.makeProtocolStdio` responses for up to one second on shutdown.
