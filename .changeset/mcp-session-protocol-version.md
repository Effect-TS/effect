---
"effect": patch
---

`McpServer.layerHttp` uses the negotiated protocol version when a session request omits `MCP-Protocol-Version`. Unsupported or mismatched protocol versions, missing required `MCP-Session-Id` headers, and `initialize` requests with a session header now return JSON-RPC error bodies.
