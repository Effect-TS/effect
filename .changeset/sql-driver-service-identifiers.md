---
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

Each driver service (`PgClient`, `PgliteClient`, `LibsqlClient`, `MysqlClient`, `MssqlClient`, `ClickhouseClient`, `D1Client` and every `SqliteClient`) is now a class-style service whose identifier is distinct from `SqlClient`. The runtime key is unchanged, and `yield* PgClient.PgClient`, `Effect<A, E, PgClient.PgClient>` and `Layer<PgClient.PgClient | SqlClient.SqlClient>` keep working.

The client shape moved to a new `Service` interface in each driver module. If you annotated a client value with the driver type, use `Service` instead:

```ts
import { PgClient } from "@effect/sql-pg"

// before
const useClient = (pg: PgClient.PgClient) => pg.config

// after
const useClient = (pg: PgClient.Service) => pg.config
```

A driver identifier is no longer a subtype of `SqlClient.SqlClient`. Code that picks between driver layers, such as `cond ? PgClient.layer(...) : MysqlClient.layer(...)`, may need an explicit `Layer.Layer<SqlClient.SqlClient, E>` annotation.
