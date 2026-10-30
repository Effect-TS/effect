---
"@effect/sql-libsql": minor
---

Send `SqlClient.batch` as one libSQL batch, so a remote libSQL or Turso database runs it in one round trip instead of one per statement. Outside `withTransaction`, libSQL runs the batch as one write transaction: a failing statement fails the batch and nothing from it is kept. Inside `withTransaction` the batch runs in the open transaction, and a failing statement fails the batch so the enclosing transaction rolls back as usual. PostgreSQL and libSQL batches are atomic on their own, and D1 is atomic through `D1Client.batch`; other drivers run the statements one at a time, so wrap the batch in `withTransaction` when it must be atomic.
