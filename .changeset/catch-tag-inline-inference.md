---
"effect": patch
---

Fix data-first `Effect.catchTag` type inference when `self` is an inline call such as `Effect.map(...)`.
