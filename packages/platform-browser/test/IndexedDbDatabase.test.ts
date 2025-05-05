import {
  IndexedDb,
  IndexedDbDatabase,
  IndexedDbMigration,
  IndexedDbQuery,
  IndexedDbTable,
  IndexedDbVersion
} from "@effect/platform-browser"
import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const databaseName = "db"

const layerFakeIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))

const provideMigration = (migration: IndexedDbMigration.IndexedDbMigration.Any) =>
  Effect.provide(
    IndexedDbQuery.layer.pipe(
      Layer.provide(
        IndexedDbDatabase.layer(databaseName, migration).pipe(Layer.provide(layerFakeIndexedDb))
      )
    )
  )

afterEach(() => {
  indexedDB.deleteDatabase(databaseName)
})

describe("IndexedDbDatabase", () => {
  it.effect("insert and read todos", () => {
    const Table = IndexedDbTable.make(
      "todo",
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "id", indexes: { titleIndex: "title" } }
    )

    const Db = IndexedDbVersion.make(Table)

    class Migration extends IndexedDbMigration.make(Db, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.from("todo").insert({ id: 1, title: "test", completed: false })
      }))
    {}

    return Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const todo = yield* api.from("todo").select()

      const name = yield* use(async (database) => database.name)
      const version = yield* use(async (database) => database.version)
      const objectStoreNames = yield* use(async (database) => database.objectStoreNames)
      const indexNames = yield* use(async (database) => database.transaction("todo").objectStore("todo").indexNames)
      const index = yield* use(async (database) => database.transaction("todo").objectStore("todo").index("titleIndex"))

      assert.equal(name, "db")
      assert.equal(version, 1)
      assert.deepStrictEqual(todo, [{ id: 1, title: "test", completed: false }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["todo"])
      assert.deepStrictEqual(Array.from(indexNames), ["titleIndex"])
      assert.deepStrictEqual(index.keyPath, "title")
    }).pipe(provideMigration(Migration))
  })

  it.effect("transaction", () => {
    const Table = IndexedDbTable.make(
      "todo",
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "id", indexes: { titleIndex: "title" } }
    )

    const Table2 = IndexedDbTable.make(
      "user",
      Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      }),
      { keyPath: "id" }
    )

    const Db = IndexedDbVersion.make(Table, Table2)

    class Migration extends IndexedDbMigration.make(Db, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.from("todo").insert({ id: 1, title: "test", completed: false })
      }))
    {}

    return Effect.gen(function*() {
      const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)

      yield* api.transaction(
        ["todo"],
        "readwrite",
        (api) =>
          Effect.gen(function*() {
            return yield* api.from("todo").insert({ id: 2, title: "test2", completed: false })
          })
      )

      const todo = yield* api.from("todo").select()

      assert.deepStrictEqual(todo, [{ id: 1, title: "test", completed: false }, {
        id: 2,
        title: "test2",
        completed: false
      }])
    }).pipe(provideMigration(Migration))
  })

  it.effect("migration sequence", () => {
    const Table1 = IndexedDbTable.make(
      "todo",
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "id", indexes: { titleIndex: "title" } }
    )

    const Table2 = IndexedDbTable.make(
      "todo",
      Schema.Struct({
        uuid: Schema.UUID,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "uuid" }
    )

    const Db1 = IndexedDbVersion.make(Table1)
    const Db2 = IndexedDbVersion.make(Table2)
    const uuid = "9535a059-a61f-42e1-a2e0-35ec87203c24"

    class Migration extends IndexedDbMigration.make(Db1, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.from("todo").insert({ id: 1, title: "test", completed: false })
      })).add(Db2, (from, to) =>
        Effect.gen(function*() {
          const todo = yield* from.from("todo").select()
          yield* from.deleteIndex("todo", "titleIndex")
          yield* from.deleteObjectStore("todo")
          yield* to.createObjectStore("todo")
          yield* to.from("todo").insertAll(
            todo.map((t) => ({ uuid, title: t.title, completed: t.completed }))
          )
        }))
    {}

    return Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db2)
      const todo = yield* api.from("todo").select()
      const name = yield* use(async (database) => database.name)
      const version = yield* use(async (database) => database.version)
      const objectStoreNames = yield* use(async (database) => database.objectStoreNames)
      const indexNames = yield* use(async (database) => database.transaction("todo").objectStore("todo").indexNames)

      assert.equal(name, "db")
      assert.equal(version, 2)
      assert.deepStrictEqual(todo, [{ uuid, title: "test", completed: false }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["todo"])
      assert.deepStrictEqual(Array.from(indexNames), [])
    }).pipe(provideMigration(Migration))
  })

  it.effect("delete object store migration", () => {
    const Table1 = IndexedDbTable.make(
      "todo",
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "id" }
    )

    const Table2 = IndexedDbTable.make(
      "user",
      Schema.Struct({
        userId: Schema.Number,
        name: Schema.String,
        email: Schema.String
      }),
      { keyPath: "userId" }
    )

    const Db1 = IndexedDbVersion.make(Table1)
    const Db2 = IndexedDbVersion.make(Table2, Table1)

    class Migration extends IndexedDbMigration.make(Db1, (api) => api.createObjectStore("todo")).add(
      Db2,
      (from, to) =>
        Effect.gen(function*() {
          yield* from.deleteObjectStore("todo")
          yield* to.createObjectStore("user")
          yield* to.from("user").insert({ userId: 1, name: "John Doe", email: "john.doe@example.com" })
        })
    ) {}

    return Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db2)
      const user = yield* api.from("user").select()

      const name = yield* use(async (database) => database.name)
      const version = yield* use(async (database) => database.version)
      const objectStoreNames = yield* use(async (database) => database.objectStoreNames)
      assert.equal(name, "db")
      assert.equal(version, 2)
      assert.deepStrictEqual(user, [{ userId: 1, name: "John Doe", email: "john.doe@example.com" }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["user"])
    }).pipe(provideMigration(Migration))
  })
})
