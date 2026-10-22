// Run: node scratchpad/sql-typesafe/main.ts
// Check: pnpm --filter scratchpad sql:check
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as Effect from "effect/Effect"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"
import { DatabaseSchema } from "./database.ts"
import { migrations } from "./migrations.ts"

const result = await Effect.gen(function*() {
  // Apply the same migrations used to generate _schema.json to a fresh database.
  yield* Migrator.make({})({ loader: migrations })
  const sql = yield* SqlClient.makeQuery(DatabaseSchema)

  const statement = sql(
    `
      SELECT id AS userId, name, email FROM users
      WHERE age >= :minimumAge
      ORDER BY name
      LIMIT :limit
    `,
    { minimumAge: 18, limit: 2 }
  )

  // Hover over users: userId is number, name is string, email is string | null.
  // No row interfaces or generic type arguments are needed.
  const users = yield* statement
  const cards = users.map((user) => ({
    id: user.userId.toFixed(0),
    name: user.name.toUpperCase(),
    email: user.email?.toLowerCase() ?? "(no email)"
  }))

  // This input remains a bound value; it cannot change the SQL query.
  const untrustedName = "' OR 1=1 --"
  const matches = yield* sql("SELECT id FROM users WHERE name = :name", { name: untrustedName })

  // Uncomment one line and run the Check command above to see its diagnostic:
  // sql("SELECT nickname FROM users")                          // unknown column
  // sql("SELECT id FROM accounts")                             // unknown table
  // sql("SELECT id FROM users WHERE id = :id", { id: "1" })     // id must be a number
  // sql("SELECT id FROM users WHERE id = :id")                  // missing parameter
  // users[0].email.toLowerCase()                                // possibly null
  // users[0].age                                               // not selected

  const [text, parameters] = statement.compile()
  return {
    sql: text.replace(/\s+/g, " ").trim(),
    parameters,
    cards,
    untrustedNameMatches: matches.length
  }
}).pipe(
  Effect.provide([DatabaseSchema.layer, SqliteClient.layer({ filename: ":memory:" })]),
  Effect.runPromise
)

console.log(JSON.stringify(result, null, 2))
