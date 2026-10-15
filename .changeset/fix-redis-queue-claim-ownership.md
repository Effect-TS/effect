---
"effect": minor
---

Isolate Redis PersistedQueue locks by queue and acquisition so stale handlers cannot settle or refresh another live claim. The new lock format requires stopping all old workers, including suspended handlers, and waiting for legacy leases to expire before starting upgraded consumers together on the same prefix; preserve existing queue data, or explicitly migrate the backlog when using a fresh prefix.
