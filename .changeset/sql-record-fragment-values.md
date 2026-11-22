---
"effect": patch
---

Throw on unsupported SQL fragments in `sql.insert`, `sql.update`, and `sql.updateValues` instead of silently binding `NULL` or truncating expressions.
