---
"effect": patch
---

Fix `Cache.get` to keep a shared lookup running when one of multiple waiting consumers is interrupted. Replace the unsafe `Cache.Entry.deferred` field with an `effect` that participates in lookup lifetime management.
