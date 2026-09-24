---
"effect": patch
---

Improve the defect raised by `McpServer.toolkit` when a tool's parameters do not encode to an object-rooted JSON Schema (for example a union of structs or `Schema.Struct({})`). The message now names the tool, explains that MCP requires an object root, and points to `Tool.EmptyParams` for tools without parameters.
