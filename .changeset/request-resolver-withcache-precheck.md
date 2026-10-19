---
"effect": patch
---

Fix `RequestResolver.withCache` replacing the wrapped resolver's `preCheck` instead of calling it on cache misses. Requests the inner `preCheck` completes are no longer sent to the batch, and a `withCache` wrapped around another `withCache` now uses the inner cache.
