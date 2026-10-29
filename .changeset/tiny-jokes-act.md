---
"effect": minor
---

`McpClient` now exposes the server's `capabilities`, and `listTools`, `listPrompts` and `listResources` accept page and item `limits`, with client-wide defaults set through `discoveryLimits`. `McpClient.toolkit` accepts an options object: `tools` binds an approved descriptor snapshot without rediscovery, `resultMode: "complete"` keeps the full `CallToolResult` and sends its content to the model as text and file parts, `failureMode: "return"` returns typed failures to the model, `trustAnnotations` copies server hints into tool annotations, and `transformTool` customizes each tool before binding. `McpClient.toolkit(client, prefix)` is unchanged.
