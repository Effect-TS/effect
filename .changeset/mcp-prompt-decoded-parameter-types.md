---
"effect": patch
---

Fix `McpServer.registerPrompt` types so content handlers receive decoded parameter values, including optional fields, and completion handlers return decoded suggestions. This matches existing runtime behavior and `McpServer.prompt`; handlers should use decoded values rather than schema objects.
