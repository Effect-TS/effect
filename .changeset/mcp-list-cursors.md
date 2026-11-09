---
"effect": patch
---

Fix `McpServer` accepting cursors on core lists that never issue them, returning `InvalidParams` instead.
