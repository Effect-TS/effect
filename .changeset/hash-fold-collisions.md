---
"effect": patch
---

Fix hash composition collisions in `Hash.combine`, `Hash.array`, `Hash.structureKeys`, `HashMap`, `HashSet`, `Trie`, and `Graph`. Ordered folds now run a multiply-and-finalize mix, unordered folds XOR the mixed terms, and non-integer numbers hash from their IEEE-754 bits. Hash values change as a result.

Also fix cyclic values leaking entry-point dependent hashes into the hash cache, `Equal.equals` caching a provisional circular `true`, and `MutableHashMap` losing its own entries after being used as a lookup key.
