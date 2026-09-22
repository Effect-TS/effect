---
"effect": patch
---

Fix hash composition collisions and non-integer number hashing. Correct cyclic equality and singleton hashes, prevent invalid caches, and fix referential key lookups in `MutableHashMap`. Hash values will change.
