---
"effect": patch
---

Speed up field copying for `Data.Class`, `Data.Error`, `Request` and `Persistable` construction while retaining safe handling of own `__proto__` properties on plain objects.
