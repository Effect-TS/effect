---
"effect": patch
---

Reduce per-entry overhead in `EventLog` remote replay by caching payload decoders per handler and merging handler contexts once per batch.
