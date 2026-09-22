---
"effect": patch
---

Fix hash composition collisions and non-integer number hashing. Use cyclic bisimulation for equality and hash-grouped matching for native maps and sets. Separate singleton hashes from their string names, prevent invalid caches, and fix referential key lookups in `MutableHashMap`. Hash values will change.
