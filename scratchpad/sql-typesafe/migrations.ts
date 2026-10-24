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
  }),
  "0002_create_profiles": Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    yield* sql`
      CREATE TABLE profiles (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        bio TEXT NOT NULL,
        note TEXT
      ) STRICT
    `
    // The unmatched profile also lets the verifier exercise RIGHT and FULL joins.
    yield* sql`
      INSERT INTO profiles (id, user_id, bio, note) VALUES
        (10, 1, 'Analytical Engine', NULL),
        (20, 99, 'No matching user', NULL)
    `
  })
})
