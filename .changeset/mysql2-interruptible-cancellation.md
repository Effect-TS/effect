---
"@effect/sql-mysql2": patch
---

Fix interruption in `MysqlClient`. Interrupting a running statement or stream now stops it with `KILL QUERY`, sent over a separate connection, and keeps the pool connection until the statement has settled, so the next query does not wait behind it. Interrupting a fiber waiting for a connection in `sql.reserve` or `withTransaction` now returns immediately, and a connection the pool delivers after the interruption goes back to the pool. If the kill and the statement do not settle within 5 seconds, the connection is destroyed instead of reused. Statements and streams that share a transaction or reserved connection now run one at a time, so interrupting one never stops another.
