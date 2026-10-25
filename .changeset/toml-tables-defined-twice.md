---
"effect": patch
---

Fix `Toml.parse` accepting tables defined twice, such as a `[table]` header for a table that dotted keys already defined.
