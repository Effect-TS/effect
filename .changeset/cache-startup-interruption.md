---
"effect": patch
---

Fix a Cache.get interruption race that could leave an abandoned lookup running and its key stuck in the cache.
