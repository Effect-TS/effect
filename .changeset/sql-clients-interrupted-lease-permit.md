---
"@effect/sql-pglite": patch
"@effect/sql-libsql": patch
"@effect/sql-sqlite-do": patch
---

Fix the PGlite, libSQL and Durable Object SQLite clients hanging forever after a queued query or `withTransaction` is interrupted just as it takes the connection. Their connection permit could stay taken with no release registered, as #9962 fixed for the shared SQLite clients; they now take it with `Semaphore.takeScoped`.
