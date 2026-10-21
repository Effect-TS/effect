---
"effect": patch
---

Fix the Redis PersistedQueue store dropping entries when a payload or custom id contains a lone UTF-16 surrogate.
