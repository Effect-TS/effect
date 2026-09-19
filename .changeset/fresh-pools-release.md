---
"effect": patch
---

Fix memory leaks in `Pool.makeWithTTL` with the usage strategy by releasing retired resources and consumed acquisition errors from the TTL queue.
