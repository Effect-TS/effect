---
"effect": patch
---

Treat a `"~effect/Equal"` or `"~effect/Hash"` key whose value is not a function as ordinary data. `Equal.isEqual` and `Hash.isHash` now require a function, so `Equal.equals` and `Hash.hash` no longer throw `TypeError: self[symbol] is not a function` on plain objects, such as parsed JSON, that happen to carry one of these keys.
