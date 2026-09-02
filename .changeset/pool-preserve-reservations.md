---
"effect": patch
---

Keep `Pool.reserve` items out of shared circulation when other borrowers return or overlapping reservations close. Restore available slots only after the last reservation closes.

Overlapping reservations on the same item now count `usage` once instead of once per reservation, and the usage TTL strategy no longer reclaims reserved items, acquiring a fresh item for waiters instead. `Pool.reserve` is now a full no-op when per-item concurrency is `1`; previously it removed the item from availability while leaving its capacity unchanged.
