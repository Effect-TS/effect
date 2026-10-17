---
"effect": patch
---

Throw a clear error when compiling `sql.insert([])` or `sql.updateValues([], ...)` instead of an incidental `TypeError`.
