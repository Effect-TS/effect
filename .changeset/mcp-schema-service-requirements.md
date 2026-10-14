---
"effect": patch
---

Fix missing schema service requirements in `McpServer.resource` URI templates and in `McpServer.prompt` / `McpServer.registerPrompt` completion handlers. Resource template layers now retain parameter decoding and encoding services, and prompt APIs require encoding services for parameters with completion handlers, so missing services are caught at compile time instead of failing at runtime.
