---
"effect": patch
---

Restrict the MCP Skills extension to protocol 2026-07-28. `McpServer` no longer declares or serves it on earlier revisions, and `McpClient` fails with `UnsupportedError` when `extensions: { skills: true }` is paired with an earlier protocol.

Clients that use Skills must select `McpProtocol.v2026_07_28`. On earlier revisions, read known skill files with `readResource`.
