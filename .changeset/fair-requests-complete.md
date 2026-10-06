---
"effect": patch
---

Fix stack overflow when many equal requests share a pending `RequestResolver.withCache` entry.
