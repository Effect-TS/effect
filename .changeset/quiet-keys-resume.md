---
"effect": patch
---

Fix `Effect.effectify` so throwing error mappers become defects instead of escaping asynchronous callbacks and leaving fibers suspended.
