---
"@effect/sql-pg": patch
---

Invalidate a `PgConnection` pin when its scope closes. Statements, streams and listeners started through a released pin, including a fiber that outlives `withTransaction`, now fail instead of running on the next borrower's session, and `interrupt` on a released pin no longer cancels another borrower's query. A session released while such a statement is still on the wire is closed instead of being handed to the next borrower.
