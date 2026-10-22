// Run: node scratchpad/sql-typesafe/main.ts
// Check: pnpm --filter scratchpad sql:check
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as Effect from "effect/Effect"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"
import schema from "./_schema.json" with { type: "json" }
import { migrations } from "./migrations.ts"

export class Database extends SqlClient.Service<Database>()("scratchpad/Database", { schema }) {}

const result = await Effect.gen(function*() {
  // Apply the same migrations used to generate _schema.json to a fresh database.
  yield* Migrator.make({})({ loader: migrations })
  const sql = yield* Database

  const statement = sql(
    `
      SELECT u.id AS userId, u.name, u.email, p.bio AS profileBio
      FROM users AS u LEFT JOIN profiles AS p ON u.id = p.user_id
      WHERE u.age >= :minimumAge
      ORDER BY u.name
      LIMIT :limit
    `,
    { minimumAge: 18, limit: 2 }
  )

  // Inferred: readonly { readonly userId: number; readonly name: string;
  //   readonly email: string | null; readonly profileBio: string | null }[]
  // profiles.bio is NOT NULL, but LEFT JOIN makes it nullable here.
  const users = yield* statement
  const cards = users.map((user) => ({
    id: user.userId.toFixed(0),
    name: user.name.toUpperCase(),
    email: user.email?.toLowerCase() ?? "(no email)",
    profile: user.profileBio ?? "(no profile)"
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
  // users[0].profileBio.toUpperCase()                           // possibly null after LEFT JOIN
  // users[0].age                                               // not selected

  const [text, parameters] = statement.compile()
  return {
    sql: text.replace(/\s+/g, " ").trim(),
    parameters,
    cards,
    untrustedNameMatches: matches.length
  }
}).pipe(
  Effect.provide(Database.layer),
  Effect.provide(SqliteClient.layer({ filename: ":memory:" })),
  Effect.runPromise
)

console.log(JSON.stringify(result, null, 2))
