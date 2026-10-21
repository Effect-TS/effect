---
"effect": patch
---

Stop publishing a non-recursive MCP tool schema root in `$defs` as well as inline, so `tools/list` no longer sends it twice. A custom `toJsonSchema` `$ref` into the root's own definition, such as `#/$defs/Note/properties/title` when `Note` is the tool schema, no longer resolves.
