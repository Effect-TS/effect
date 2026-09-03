---
"@effect/sql-libsql": patch
---

Keep transactions isolated between separately created libSQL clients. Queries and nested transactions on another
client now use that client's database instead of inheriting the active transaction from the first client.
