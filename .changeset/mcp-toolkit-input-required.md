---
"effect": minor
---

Add an `inputRequired` option to `McpServer.toolkit` and `McpServer.registerToolkit` that turns a tool's declared failure into an MCP `input_required` result on protocols that support client input, so toolkit tools can ask the client for input and resume when the call is retried.
