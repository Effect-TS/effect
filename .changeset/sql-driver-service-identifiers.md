---
"effect": patch
"@effect/sql-clickhouse": patch
"@effect/sql-d1": patch
"@effect/sql-libsql": patch
"@effect/sql-mssql": patch
"@effect/sql-mysql2": patch
"@effect/sql-pg": patch
"@effect/sql-pglite": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-do": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-react-native": patch
"@effect/sql-sqlite-wasm": patch
---

Fix providing a generic `SqlClient` layer removing a driver service such as `PgClient` from an effect's requirements. The program type-checked as runnable but failed at runtime with `Service not found`.

A driver client is no longer a subtype of `SqlClient.SqlClient`. Code that picks between driver layers, such as `cond ? PgClient.layer(...) : MysqlClient.layer(...)`, may need an explicit `Layer.Layer<SqlClient.SqlClient, E>` annotation.
