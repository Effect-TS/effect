---
"effect": patch
---

Resolve a Schema union's candidate parsers once per union instead of on every decode, so union decoding and encoding allocate less and run faster.
