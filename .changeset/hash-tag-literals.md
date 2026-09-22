---
"effect": patch
---

Precompute constant tag hashes as literals so hashing `Option`, `Result`, `Exit`, `Cause` reasons, `DateTime` zones, `NetAddress`, `AsyncResult`, `HashMap`, `HashSet`, `Trie` and `Graph` no longer rehashes their tag names on every call.
