---
"effect": patch
---

Fix `McpServer.resource` and `McpServer.registerResource` dropping the registered `mimeType` when reading a resource whose handler returns a string or bytes.
