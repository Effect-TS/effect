---
"effect": patch
"@effect/opentelemetry": patch
---

Stop `ScopedCache` entries whose lookup registers a finalizer from retaining the first requester's span and its response until the entry is removed, while keeping lookup spans parented to the requester.
