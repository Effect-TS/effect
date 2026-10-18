---
"effect": patch
---

Fix Struct parsers sharing one output object when the same suspended parsing Effect is run more than once, which overwrote earlier results.
