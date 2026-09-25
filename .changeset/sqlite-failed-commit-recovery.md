---
"effect": patch
"@effect/sql-sqlite-node": patch
---

Recover SQLite connections after failed transaction commits when possible, and reject reuse if cleanup fails. Failed transaction acquisition now releases its scoped connection resources.
