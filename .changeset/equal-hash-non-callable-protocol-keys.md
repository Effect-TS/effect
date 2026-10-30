---
"effect": patch
---

Fix `Equal.equals` and `Hash.hash` throwing on plain objects whose `"~effect/Equal"` or `"~effect/Hash"` key is not a function. Such values are now treated as data.
