---
"effect": patch
---

Speed up `Data.Class` construction: copy fields with `Object.assign` unless the source has an own `__proto__` key.
