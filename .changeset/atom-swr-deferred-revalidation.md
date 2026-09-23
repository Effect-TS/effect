---
"effect": patch
---

Defer stale-while-revalidate refreshes until after atom reads finish. Cancel queued refreshes on disposal and skip them when the source has become fresh.
