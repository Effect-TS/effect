---
"effect": patch
---

`McpServer.layerHttp` accepts a session request without an `MCP-Protocol-Version` header and uses the version negotiated at initialization. Rejections for an unsupported or mismatched protocol version header, a missing `MCP-Session-Id`, or an `initialize` that carries one now include a JSON-RPC error body.
