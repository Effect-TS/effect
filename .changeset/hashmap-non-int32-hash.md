---
"effect": patch
---

Fix `HashMap` and `HashSet` overflowing the stack for keys whose custom hashes are not 32-bit integers.
