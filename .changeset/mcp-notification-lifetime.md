---
"effect": patch
---

Fix `McpServer` subscription closure and active progress reporting, and drain buffered `RpcServer` stdio responses before closing the transport.
