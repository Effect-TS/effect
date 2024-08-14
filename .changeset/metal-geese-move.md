---
"@effect/sql-sqlite-react-native": minor
"@effect/sql-sqlite-node": minor
"@effect/sql-sqlite-wasm": minor
"@effect/sql-sqlite-bun": minor
"@effect/sql-mysql2": minor
"@effect/sql-mssql": minor
"@effect/sql-d1": minor
"@effect/sql-pg": minor
"@effect/sql": minor
---

Add support for executing raw SQL queries with the underlying SQL client.

This is primarily useful when the SQL client returns special results for certain
query types.

For example, because MySQL does not support the `RETURNING` clause, the `mysql2`
client will return a [`ResultSetHeader`](https://sidorares.github.io/node-mysql2/docs/documentation/typescript-examples#resultsetheader)
for `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` operations.

To gain access to the raw results of a query, you can use the `.raw` property on
the `Statement`:

```ts
import * as Effect from "effect/Effect"
import * as SqlClient from "@effect/sql/SqlClient"
import * as MysqlClient from "@effect/sql/MysqlClient"

const DatabaseLive = MysqlClient.layer({
  database: Config.succeed("database"),
  username: Config.succeed("root"),
  password: Config.succeed(Redacted.make("password")),
})

const program = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  const result = yield* sql`INSERT INTO usernames VALUES ("Bob")`.raw

  console.log(result)
  /**
   * ResultSetHeader {
   *   fieldCount: 0,
   *   affectedRows: 1,
   *   insertId: 0,
   *   info: '',
   *   serverStatus: 2,
   *   warningStatus: 0,
   *   changedRows: 0
   * }
   */
})

program.pipe(
  Effect.provide(DatabaseLive),
  Effect.runPromise
)
```
