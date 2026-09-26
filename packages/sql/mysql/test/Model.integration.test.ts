import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Model } from "effect/unstable/schema"
import { SqlClient, SqlModel } from "effect/unstable/sql"
import { MysqlContainer } from "./utils.ts"

class User extends Model.Class<User>("User")({
  id: Schema.Int.pipe(Model.FieldExcept(["insert"])),
  name: Schema.String,
  age: Schema.Int
}) {}

describe("SqlModel", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds", excludeTestServices: true })(
    "against a real server",
    (it) => {
      it.effect("insert returns the inserted row", () =>
        Effect.gen(function*() {
          const repo = yield* SqlModel.makeRepository(User, {
            tableName: "users_insert",
            idColumn: "id",
            spanPrefix: "UserRepository"
          })
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE users_insert (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

          // MySQL has no RETURNING, so the core issues the insert and a
          // LAST_INSERT_ID select as one multi-statement text command.
          const result = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
          assert.deepStrictEqual(result, new User({ id: 1, name: "Alice", age: 30 }))
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

      it.effect("insert returns the inserted row with transforms", () =>
        Effect.gen(function*() {
          const repo = yield* SqlModel.makeRepository(User, {
            tableName: "users_transforms",
            idColumn: "id",
            spanPrefix: "UserRepository"
          })
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE users_transforms (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

          const result = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
          assert.deepStrictEqual(result, new User({ id: 1, name: "Alice", age: 30 }))
        }).pipe(Effect.provide(MysqlContainer.clientWithTransforms)), { timeout: 60_000 })

      it.effect("insertVoid, findById and update round-trip", () =>
        Effect.gen(function*() {
          const repo = yield* SqlModel.makeRepository(User, {
            tableName: "users_crud",
            idColumn: "id",
            spanPrefix: "UserRepository"
          })
          const sql = yield* SqlClient.SqlClient
          yield* sql`CREATE TABLE users_crud (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

          yield* repo.insertVoid(User.insert.make({ name: "Bob", age: 40 }))
          const found = yield* repo.findById(1)
          assert.deepStrictEqual(found, new User({ id: 1, name: "Bob", age: 40 }))

          const updated = yield* repo.update(new User({ id: 1, name: "Bobby", age: 41 }))
          assert.deepStrictEqual(updated, new User({ id: 1, name: "Bobby", age: 41 }))

          yield* repo.delete(1)
          // findById fails rather than returning an Option when the row is gone.
          const missing = yield* Effect.flip(repo.findById(1))
          assert.strictEqual(missing._tag, "NoSuchElementError")
        }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })
    }
  )
})
