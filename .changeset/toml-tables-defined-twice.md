---
"effect": patch
---

Fix `Toml.parse` accepting a table defined twice, such as a `[table]` header for a table that dotted keys already defined.
