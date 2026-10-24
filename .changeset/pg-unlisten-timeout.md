---
"@effect/sql-pg": patch
---

Close a PostgreSQL session that does not confirm `UNLISTEN` within 5 seconds, so closing a `listen` scope on a silently dropped connection no longer hangs until the OS gives up on the socket.
