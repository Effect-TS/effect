---
"effect": patch
---

Skip savepoint release when an ancestor transaction ends during rollback, preserving the original failure without using the released connection.
