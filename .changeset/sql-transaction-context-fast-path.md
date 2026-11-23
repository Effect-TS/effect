---
"effect": patch
---

Reduce the overhead of `SqlClient` transactions and savepoints by avoiding a redundant copy of the caller's services.
