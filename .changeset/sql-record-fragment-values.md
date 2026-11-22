---
"effect": patch
---

Reject unsupported SQL fragments in `sql.insert`, `sql.update`, and `sql.updateValues` with an error naming the column instead of silently binding `NULL` or truncating expressions.
