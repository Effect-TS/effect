---
"effect": patch
---

Stamp a `ScopedCache` entry's expiry before completing its lookup. Since lookups run in their own fiber, a caller resumed by the completion could call `get` again before the expiry was set and receive a failure whose `timeToLive` is zero instead of running the lookup again.
