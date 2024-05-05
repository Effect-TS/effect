---
"@effect/sql-sqlite-react-native": minor
"@effect/sql-sqlite-node": minor
"@effect/sql-sqlite-wasm": minor
"@effect/sql-sqlite-bun": minor
"@effect/sql-mysql2": minor
"@effect/sql-mssql": minor
"@effect/sql-pg": minor
"@effect/sql": minor
---

make @effect/sql dialect agnostic

All of the client implementations now share the same Context.Tag. This means you can create
services that support multiple SQL flavors.

You can now use the `@effect/sql` package to access the client apis:

```ts
import * as Sql from "@effect/sql"
import { Effect } from "effect"

Effect.gen(function* () {
  const sql = yield* Sql.client.Client
  yield* sql`SELECT * FROM users`
})
```

If you need a functionality that is specific to a implementation, you can use the tag from the
implementation package:

```ts
import * as Sqlite from "@effect/sql-sqlite-node"
import { Effect } from "effect"

Effect.gen(function* () {
  const sql = yield* Sqlite.client.SqliteClient
  const dump = yield* sql.export
})
```

If you need to run a different query depending on the dialect, you can use the `sql.onDialect` api:

```ts
import * as Sql from "@effect/sql"
import { Effect } from "effect"

Effect.gen(function* () {
  const sql = yield* Sql.client.Client
  yield* sql.onDialect({
    sqlite: () => sql`SELECT * FROM sqlite_master`,
    mysql: () => sql`SHOW TABLES`,
    mssql: () => sql`SELECT * FROM sys.tables`,
    pg: () => sql`SELECT * FROM pg_catalog.pg_tables`
  })
})
```
