---
"@effect/sql-sqlite-do": patch
---

Support nested transactions through Durable Object storage callbacks, allowing caught child failures and interruptions to roll back independently of the outer transaction.
