import * as Effect from "effect/Effect"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"

export const migrations = Migrator.fromRecord({
  "0001_create_users": Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    yield* sql`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        age INTEGER NOT NULL
      ) STRICT
    `
    yield* sql`
      INSERT INTO users (id, name, email, age) VALUES
        (1, 'Ada', NULL, 36),
        (2, 'Grace', 'grace@example.com', 85),
        (3, 'Sam', 'sam@example.com', 17)
    `
  })
})
