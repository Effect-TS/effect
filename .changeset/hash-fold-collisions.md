---
"effect": patch
---

Fix hash composition collisions and non-integer number hashing. Prevent invalid cycle caches in `Hash` and `Equal`, and fix referential key lookups in `MutableHashMap`. Hash values will change.
