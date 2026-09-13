---
"effect": patch
---

Honor `Tool.Strict` in `McpServer` by advertising closed input schemas and rejecting excess properties. `Toolkit.handle` accepts an excess-property decoding option, and returned toolkit failures are marked as MCP tool errors. Strict dynamic tools backed by raw JSON Schema must use an Effect Schema for server-side validation.
