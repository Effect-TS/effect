---
"effect": patch
---

Fix `ScopedCache.refresh` handling lookup functions that throw synchronously. Cache the defect according to the configured TTL instead of leaving readers waiting indefinitely for a missing key or retaining the old value for an existing key.
