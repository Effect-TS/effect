---
"effect": patch
---

Fix cluster request primary key collisions when entity types, entity IDs, or RPC tags contain slashes. Preserve unambiguous keys and let SQL storage deduplicate matching requests stored under legacy keys.
