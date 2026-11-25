---
"effect": patch
---

Fix `Stream.toAsyncIterable` dropping values or leaving reads pending after closing when `next()` calls overlap.
