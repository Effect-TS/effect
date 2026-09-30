---
"effect": patch
---

Fix `MutableHashMap` retaining previously used equal object keys after they are replaced or removed, including when `Cache` and `ScopedCache` refresh entries on hits.
