---
"effect": patch
---

Fix `RequestResolver.persisted` to persist only refresh results when using `staleWhileRevalidate`. Whole-batch refresh failures now replace stale values, while refreshes that complete no entries leave the original expiry unchanged.
