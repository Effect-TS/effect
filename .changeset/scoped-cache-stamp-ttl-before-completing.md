---
"effect": patch
---

Set `ScopedCache` entry expiry before waking lookup waiters, so a zero-TTL result cannot be reused.
