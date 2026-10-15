---
"effect": minor
---

Fence Redis PersistedQueue settlements and lock refreshes on a per-acquisition lock, so a stale handler can no longer release another live claim, including one with the same custom id in another queue. The lock format is incompatible with older workers on the same prefix: stop every old worker and let its locks expire before starting upgraded workers.
