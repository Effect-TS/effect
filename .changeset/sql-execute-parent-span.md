---
"effect": patch
---

Run SQL connection execution under the `sql.execute` span so driver I/O and nested spans nest beneath the statement instead of the enclosing span.
