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

Driver clients (`PgClient`, `PgliteClient`, `LibsqlClient`, `MysqlClient`, `MssqlClient`, `ClickhouseClient`, `D1Client` and every `SqliteClient`) no longer inherit the generic `SqlClient` type id. They extend the new `SqlClient.Base` interface instead, which has every `SqlClient` operation without the type id. Requirements still read as `PgClient`, and existing `Effect` and `Layer` annotations keep working. The value from `yield* PgClient.PgClient`, and from `PgClient.make`, is typed `PgClient & SqlClient`, so it can still be passed wherever a `SqlClient` is expected.

A value annotated as the bare driver client type no longer counts as a `SqlClient`. Annotate it as `SqlClient.SqlClient`, or as `PgClient.PgClient & SqlClient.SqlClient`, or let it be inferred:

```ts
import type { PgClient } from "@effect/sql-pg"
import type { SqlClient } from "effect/sql"

declare const runQueries: (sql: SqlClient.SqlClient) => void

// before: compiled, now a type error
const before = (pg: PgClient.PgClient) => runQueries(pg)

// after
const after = (pg: PgClient.PgClient & SqlClient.SqlClient) => runQueries(pg)
```

If you declare your own client service whose interface extends `SqlClient.SqlClient`, providing a generic `SqlClient` still erases it. Extend `SqlClient.Base` instead, and give the service shape the generic type too: `Context.Service<MyClient, MyClient & SqlClient.SqlClient>(key)`.

A driver client is no longer a subtype of `SqlClient.SqlClient`. Code that picks between driver layers, such as `cond ? PgClient.layer(...) : MysqlClient.layer(...)`, may need an explicit `Layer.Layer<SqlClient.SqlClient, E>` annotation.
