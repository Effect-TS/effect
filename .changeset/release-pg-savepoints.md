---
"effect": patch
"@effect/sql-pg": patch
---

Release PostgreSQL savepoints after nested transactions succeed or roll back, freeing transaction locks before the outer transaction completes.

Custom SQL clients can opt in through the new `releaseSavepoint` option. Clients that omit it are unchanged.
