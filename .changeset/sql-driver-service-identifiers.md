---
"@effect/sql-clickhouse": minor
"@effect/sql-d1": minor
"@effect/sql-libsql": minor
"@effect/sql-mssql": minor
"@effect/sql-mysql2": minor
"@effect/sql-pg": minor
"@effect/sql-pglite": minor
"@effect/sql-sqlite-bun": minor
"@effect/sql-sqlite-do": minor
"@effect/sql-sqlite-node": minor
"@effect/sql-sqlite-react-native": minor
"@effect/sql-sqlite-wasm": minor
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
