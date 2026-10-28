---
"effect": minor
---

Add `sessionless` to `McpServer.layerHttp`. Set, the revisions before `v2026_07_28` are served without sessions, as the Streamable HTTP transport allows: `initialize` issues no `Mcp-Session-Id`, and each later request is served as the revision its `MCP-Protocol-Version` header names, or `2025-03-26` without one. Any replica, or a restarted process, can then answer any request, where a session held in memory answers `404` and leaves the client to notice. An `Mcp-Session-Id` a client still sends is ignored.
