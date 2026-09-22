---
"effect": patch
---

Shared `ScopedCache` lookups survive individual caller interruption. If the last waiter leaves while a lookup is pending, it is interrupted and its scope closed. Missing-key lookups, including `refresh`, now run in daemon fibers like `Cache`, so children forked by a lookup end with it rather than with the caller.
