import { Model, SqlClient } from "@effect/sql"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, Schema } from "effect"
import { MysqlContainer } from "./utils.js"

class User extends Model.Class<User>("User")({
  id: Model.Generated(Schema.Int),
  name: Schema.String,
  age: Schema.Int
}) {}

describe("Model", () => {
  it.effect("insert returns result", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeRepository(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository"
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

      const result = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
      assert.deepStrictEqual(result, new User({ id: 1, name: "Alice", age: 30 }))
    }).pipe(
      Effect.provide(MysqlContainer.ClientLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.effect("insert returns result with transforms", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeRepository(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository"
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

      const result = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
      assert.deepStrictEqual(result, new User({ id: 1, name: "Alice", age: 30 }))
    }).pipe(
      Effect.provide(MysqlContainer.ClientWithTransformsLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.effect("insertVoid", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeRepository(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository"
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

      const result = yield* repo.insertVoid(User.insert.make({ name: "Alice", age: 30 }))
      assert.strictEqual(result, void 0)
    }).pipe(
      Effect.provide(MysqlContainer.ClientLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.scopedLive("insert data loader returns result", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeDataLoaders(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository",
        window: 10
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

      const [alice, john] = yield* Effect.all([
        repo.insert(User.insert.make({ name: "Alice", age: 30 })),
        repo.insert(User.insert.make({ name: "John", age: 30 }))
      ], { batching: true })
      assert.deepStrictEqual(alice.name, "Alice")
      assert.deepStrictEqual(john.name, "John")
    }).pipe(
      Effect.provide(MysqlContainer.ClientLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.scopedLive("findById data loader", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeDataLoaders(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository",
        window: 10
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`
      const alice = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
      const john = yield* repo.insert(User.insert.make({ name: "John", age: 30 }))

      const [alice2, john2] = yield* Effect.all([
        repo.findById(alice.id),
        repo.findById(john.id)
      ], { batching: true })

      assert.deepStrictEqual(Option.map(alice2, (alice) => alice.name), Option.some("Alice"))
      assert.deepStrictEqual(Option.map(john2, (john) => john.name), Option.some("John"))
    }).pipe(
      Effect.provide(MysqlContainer.ClientLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.effect("update returns result", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeRepository(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository"
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

      let result = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
      result = yield* repo.update(User.update.make({ ...result, name: "Bob" }))
      assert.deepStrictEqual(result, new User({ id: 1, name: "Bob", age: 30 }))
    }).pipe(
      Effect.provide(MysqlContainer.ClientLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })

  it.effect("update returns result with transforms", () =>
    Effect.gen(function*() {
      const repo = yield* Model.makeRepository(User, {
        tableName: "users",
        idColumn: "id",
        spanPrefix: "UserRepository"
      })
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT)`

      let result = yield* repo.insert(User.insert.make({ name: "Alice", age: 30 }))
      result = yield* repo.update(User.update.make({ ...result, name: "Bob" }))
      assert.deepStrictEqual(result, new User({ id: 1, name: "Bob", age: 30 }))
    }).pipe(
      Effect.provide(MysqlContainer.ClientWithTransformsLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60_000 })
})
