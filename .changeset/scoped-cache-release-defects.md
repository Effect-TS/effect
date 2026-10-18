---
"effect": patch
---

Propagate all release defects from `ScopedCache.invalidateAll` and cache owner-scope shutdown after attempting every entry release. Successful bulk invalidation now returns `undefined` as declared.
