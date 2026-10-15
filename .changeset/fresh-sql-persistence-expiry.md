---
"effect": patch
---

Fix SQL persistence reads to check expiry on every execution, so reused `get` and `getMany` effects stop returning expired entries in both SQL layouts.
