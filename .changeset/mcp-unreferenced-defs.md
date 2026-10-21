---
"effect": patch
---

Publish only the `$defs` an MCP tool schema references. Inlining a top-level reference used to leave its definition behind, so `tools/list` sent that schema twice.
