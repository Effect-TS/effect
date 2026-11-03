---
"effect": patch
---

Stop `ScopedCache` entries whose lookup registers a finalizer from retaining the first requester's span and its response until the entry is removed.
