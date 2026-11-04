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

Each driver service (`PgClient`, `PgliteClient`, `LibsqlClient`, `MysqlClient`, `MssqlClient`, `ClickhouseClient`, `D1Client` and every `SqliteClient`) now has a requirement identifier that is separate from its client interface, such as `PgClient.PgClientId`. The runtime key is unchanged. `yield* PgClient.PgClient` still returns the client, and value annotations like `(pg: PgClient.PgClient) => pg.config` keep working.

Requirement annotations that named the client interface must use the identifier instead. The old form is now a type error:

```ts
import { PgClient } from "@effect/sql-pg"
import type { Effect, Layer } from "effect"
import type { SqlClient } from "effect/sql"

// before
type Program = Effect.Effect<void, never, PgClient.PgClient>
type Database = Layer.Layer<PgClient.PgClient | SqlClient.SqlClient>

// after
type Program = Effect.Effect<void, never, PgClient.PgClientId>
type Database = Layer.Layer<PgClient.PgClientId | SqlClient.SqlClient>
```

A driver identifier is no longer a subtype of `SqlClient.SqlClient`. Code that picks between driver layers, such as `cond ? PgClient.layer(...) : MysqlClient.layer(...)`, may need an explicit `Layer.Layer<SqlClient.SqlClient, E>` annotation.
