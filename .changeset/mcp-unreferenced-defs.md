---
"effect": patch
---

MCP tool input and output schemas now publish only the `$defs` they reference. Previously a schema whose top-level reference was inlined still carried the inlined definition, so `tools/list` sent it twice.
