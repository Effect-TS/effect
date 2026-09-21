---
"effect": patch
---

Hashes of composed values (records, arrays, `Map`, `Set`, `HashMap`, `HashSet`, `Chunk`, `Trie`, `Graph` and `Hash.combine`) no longer collide for common inputs such as records of small numbers, which made hashed collections keyed by them slow down as they grew, and persistent collections reuse hashes across versions. `Equal.equals` no longer reports unequal cyclic values as equal after an earlier comparison, and `MutableHashMap` lookups no longer fail after the map has been used as a key. Hash values change, and the prototype chain of a class instance without its own `Hash` or `Equal` is read once per prototype, so changes to it after instances are hashed or compared are not reflected.
