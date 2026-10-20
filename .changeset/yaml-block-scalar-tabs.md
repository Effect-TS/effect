---
"effect": patch
---

Fix `Yaml.parse` rejecting tabs in block scalar content and discarding the whitespace of whitespace-only block scalar lines. Leading empty lines more indented than the block scalar content are now rejected.
