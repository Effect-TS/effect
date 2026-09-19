---
"effect": patch
---

Release retired resources from the usage-TTL pool queue even when the pool remains at its minimum or target size. Cover invalidation, consumed acquisition failures and shutdown, including failures consumed while asynchronous cleanup is still running.
