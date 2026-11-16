---
"effect": patch
---

Fix `Cache` and `ScopedCache` entries failing to expire with a provided clock when the first caller is interrupted during a shared lookup.
