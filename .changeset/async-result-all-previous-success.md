---
"effect": patch
---

Fix `AsyncResult.all` returning a failing input's `previousSuccess` in that input's shape instead of the combined shape.
