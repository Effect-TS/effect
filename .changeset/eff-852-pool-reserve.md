---
"effect": patch
---

Add `Pool.reserve` for taking a leased item out of shared circulation. On a
pool with per-item `concurrency` above one, reserving consumes the item's
remaining capacity until the scope closes, so no new lease lands on it while
other checkouts grow the pool.
