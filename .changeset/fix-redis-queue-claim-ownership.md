---
"effect": minor
---

Isolate Redis PersistedQueue locks by queue and acquisition so stale handlers cannot settle or refresh another live claim, while allowing an unrecovered owner to settle or renew after lease expiry. The new ownership and lock format requires stopping all old workers, including suspended handlers, and waiting for legacy leases to expire before starting upgraded consumers together on the same prefix; mixed versions can corrupt replacement claims. Preserve existing queue data, or explicitly migrate the backlog when using a fresh prefix.
