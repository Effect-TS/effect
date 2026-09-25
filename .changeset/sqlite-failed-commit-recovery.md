---
"effect": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-wasm": patch
"@effect/sql-sqlite-react-native": patch
---

Roll back SQLite transactions left open by a failed COMMIT, such as a deferred foreign key violation, so the connection can be reused. If that ROLLBACK also fails, the connection is rejected until a later acquisition rolls it back. Adds `SqlClient.makeSqliteAcquirers`, which the SQLite clients share, and failed transaction acquisition now releases its scoped connection resources.
