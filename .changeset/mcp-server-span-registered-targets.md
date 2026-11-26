---
"effect": patch
---

Only record `McpServer` request span target suffixes and attributes (`gen_ai.tool.name`, `gen_ai.tool.call.arguments`, `gen_ai.prompt.name`, and `mcp.resource.uri`) for registered targets, keeping unresolved requests and template-matched resource URIs out of server span telemetry.
