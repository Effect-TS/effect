---
"@effect/ai": patch
---

Add optional `instructions` to `McpServer` layer options.

When provided, the string is returned in the `InitializeResult.instructions`
field per the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#initialization).
Clients can use it to improve the LLM's understanding of the server (for
example, by injecting it into the system prompt).

```ts
McpServer.layerHttp({
  name: "Demo Server",
  version: "1.0.0",
  path: "/mcp",
  instructions: "Always greet the user with a friendly hello."
})
```

The option is supported on `layer`, `layerStdio`, `layerHttp`, and
`layerHttpRouter`. It is omitted from the response when not set.
