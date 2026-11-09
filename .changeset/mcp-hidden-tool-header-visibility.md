---
"effect": patch
---

Keep tools hidden by `McpServer.visibility` undiscoverable on MCP `2026-07-28` `tools/call` requests. A missing or mismatched `x-mcp-header` parameter now fails as not found for those tools, instead of returning a header mismatch that reveals them. Visible tools still return a header mismatch.
