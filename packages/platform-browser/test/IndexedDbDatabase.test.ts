import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const databaseName = "db"

const layerFakeIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))

const provideMigration = (database: IndexedDbDatabase.Any) =>
  Effect.provide(
    database.layer(databaseName).pipe(Layer.provide(layerFakeIndexedDb))
  )

afterEach(() => {
  indexedDB.deleteDatabase(databaseName)
})

describe.sequential("IndexedDbDatabase", () => {
  it.effect("insert and read todos", () => {
    const Table = IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: "id",
      indexes: { titleIndex: "title" }
    })

    const V1 = IndexedDbVersion.make(Table)

    class Db extends IndexedDbDatabase.make(V1, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.from("todo").insert({ id: 1, title: "test", completed: false })
      }))
    {}

    return Effect.gen(function*() {
      const api = yield* Db.getQueryBuilder
      const todo = yield* api.from("todo").select()

      const name = yield* api.use(async (database) => database.name)
      const version = yield* api.use(async (database) => database.version)
      const objectStoreNames = yield* api.use(async (database) => database.objectStoreNames)
      const indexNames = yield* api.use(async (database) => database.transaction("todo").objectStore("todo").indexNames)
      const index = yield* api.use(async (database) =>
        database.transaction("todo").objectStore("todo").index("titleIndex")
      )

      assert.equal(name, "db")
      assert.equal(version, 1)
      assert.deepStrictEqual(todo, [{ id: 1, title: "test", completed: false }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["todo"])
      assert.deepStrictEqual(Array.from(indexNames), ["titleIndex"])
      assert.deepStrictEqual(index.keyPath, "title")
    }).pipe(provideMigration(Db))
  })

  it.effect("transaction", () => {
    const Table = IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: "id",
      indexes: { titleIndex: "title" }
    })

    const Table2 = IndexedDbTable.make({
      name: "user",
      schema: Schema.Struct({
        id: Schema.Number,
        name: Schema.String
      }),
      keyPath: "id"
    })

    const Db = IndexedDbVersion.make(Table, Table2)

    class Migration extends IndexedDbDatabase.make(Db, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.from("todo").insert({ id: 1, title: "test", completed: false })
      }))
    {}

    return Effect.gen(function*() {
      const api = yield* Migration.getQueryBuilder

      yield* api.transaction(
        ["todo"],
        "readwrite",
        (api) => api.from("todo").insert({ id: 2, title: "test2", completed: false }).pipe(Effect.orDie)
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
    const Table1 = IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: "id",
      indexes: { titleIndex: "title" }
    })

    const Table2 = IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        uuid: Schema.UUID,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: "uuid"
    })

    const V1 = IndexedDbVersion.make(Table1)
    const V2 = IndexedDbVersion.make(Table2)
    const uuid = "9535a059-a61f-42e1-a2e0-35ec87203c24"

    class Db extends IndexedDbDatabase
      .make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.from("todo").insert({ id: 1, title: "test", completed: false })
        }))
      .add(V2, (from, to) =>
        Effect.gen(function*() {
          const todo = yield* from.from("todo").select()
          yield* from.deleteIndex("todo", "titleIndex")
          yield* from.deleteObjectStore("todo")
          yield* to.createObjectStore("todo")
          yield* to.from("todo").insertAll(
            todo.map((t) => ({
              uuid,
              title: t.title,
              completed: t.completed
            }))
          )
        }))
    {}

    return Effect.gen(function*() {
      const api = yield* Db.getQueryBuilder
      const todo = yield* api.from("todo").select()
      const name = yield* api.use(async (database) => database.name)
      const version = yield* api.use(async (database) => database.version)
      const objectStoreNames = yield* api.use(async (database) => database.objectStoreNames)
      const indexNames = yield* api.use(async (database) => database.transaction("todo").objectStore("todo").indexNames)

      assert.equal(name, "db")
      assert.equal(version, 2)
      assert.deepStrictEqual(todo, [{ uuid, title: "test", completed: false }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["todo"])
      assert.deepStrictEqual(Array.from(indexNames), [])
    }).pipe(provideMigration(Db))
  })

  it.effect("delete object store migration", () => {
    const Table1 = IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: "id"
    })

    const Table2 = IndexedDbTable.make({
      name: "user",
      schema: Schema.Struct({
        userId: Schema.Number,
        name: Schema.String,
        email: Schema.String
      }),
      keyPath: "userId"
    })

    const V1 = IndexedDbVersion.make(Table1)
    const V2 = IndexedDbVersion.make(Table2, Table1)

    class Migration extends IndexedDbDatabase
      .make(V1, (api) => api.createObjectStore("todo"))
      .add(
        V2,
        Effect.fnUntraced(function*(from, to) {
          yield* from.deleteObjectStore("todo")
          yield* to.createObjectStore("user")
          yield* to.from("user").insert({ userId: 1, name: "John Doe", email: "john.doe@example.com" })
        })
      )
    {}

    return Effect.gen(function*() {
      const api = yield* Migration.getQueryBuilder
      const user = yield* api.from("user").select()

      const name = yield* api.use(async (database) => database.name)
      const version = yield* api.use(async (database) => database.version)
      const objectStoreNames = yield* api.use(async (database) => database.objectStoreNames)
      assert.equal(name, "db")
      assert.equal(version, 2)
      assert.deepStrictEqual(user, [{ userId: 1, name: "John Doe", email: "john.doe@example.com" }])
      assert.deepStrictEqual(Array.from(objectStoreNames), ["user"])
    }).pipe(provideMigration(Migration))
  })
})
