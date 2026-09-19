---
"effect": patch
---

Fix a memory leak in `Pool.makeWithTTL` where the usage strategy retained retired resources after invalidation, acquisition failure, or shutdown.
