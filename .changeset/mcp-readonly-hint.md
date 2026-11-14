---
"effect": patch
---

Fix `McpServer` listing tools annotated `Tool.Readonly` as destructive; they are listed with `destructiveHint: false` unless they set `Tool.Destructive`.
