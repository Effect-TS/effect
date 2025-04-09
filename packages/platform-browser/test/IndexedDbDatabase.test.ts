import { IndexedDb } from "@effect/platform"
import {
  IndexedDbDatabase,
  IndexedDbMigration,
  IndexedDbQuery,
  IndexedDbTable,
  IndexedDbVersion
} from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { indexedDB } from "fake-indexeddb"

const layerFakeIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB }))

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

    return Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const todo = yield* api.getAll("todo")
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

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.insert("todo", {
                      id: 1,
                      title: "test",
                      completed: false
                    })
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    )
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

    return Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db2)
      const todo = yield* api.getAll("todo")
      const name = yield* use(async (database) => database.name)
      const version = yield* use(async (database) => database.version)
      const objectStoreNames = yield* use(async (database) => database.objectStoreNames)
      const indexNames = yield* use(async (database) => database.transaction("todo").objectStore("todo").indexNames)
      assert.equal(name, "db")
      assert.equal(version, 2)
      assert.deepStrictEqual(todo, [{ uuid, title: "test", completed: false }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["todo"])
      assert.deepStrictEqual(Array.from(indexNames), [])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db1,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.insert("todo", {
                      id: 1,
                      title: "test",
                      completed: false
                    })
                  })
              }),
              IndexedDbMigration.make({
                fromVersion: Db1,
                toVersion: Db2,
                execute: (fromQuery, toQuery) =>
                  Effect.gen(function*() {
                    const todo = yield* fromQuery.getAll("todo")
                    yield* fromQuery.deleteIndex("todo", "titleIndex")
                    yield* fromQuery.deleteObjectStore("todo")
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.insertAll(
                      "todo",
                      todo.map((t) => ({
                        uuid,
                        title: t.title,
                        completed: t.completed
                      }))
                    )
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    )
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
    const Db2 = IndexedDbVersion.make(Table2)

    return Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db2)
      const user = yield* api.getAll("user")
      const name = yield* use(async (database) => database.name)
      const version = yield* use(async (database) => database.version)
      const objectStoreNames = yield* use(async (database) => database.objectStoreNames)
      assert.equal(name, "indexed-db")
      assert.equal(version, 2)
      assert.deepStrictEqual(user, [{ userId: 1, name: "John Doe", email: "john.doe@example.com" }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["user"])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "indexed-db",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db1,
                execute: (_, toQuery) => toQuery.createObjectStore("todo")
              }),
              IndexedDbMigration.make({
                fromVersion: Db1,
                toVersion: Db2,
                execute: (fromQuery, toQuery) =>
                  Effect.gen(function*() {
                    yield* fromQuery.deleteObjectStore("todo")
                    yield* toQuery.createObjectStore("user")
                    yield* toQuery.insert("user", {
                      userId: 1,
                      name: "John Doe",
                      email: "john.doe@example.com"
                    })
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    )
  })
})
