---
"effect": patch
---

Fix ScopedCache.get leaving readers blocked when an expired entry's finalizer fails.
