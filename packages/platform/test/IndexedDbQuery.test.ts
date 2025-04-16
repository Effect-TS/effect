import {
  IndexedDb,
  IndexedDbDatabase,
  IndexedDbMigration,
  IndexedDbQuery,
  IndexedDbTable,
  IndexedDbVersion
} from "@effect/platform"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const layerFakeIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))

class Table1 extends IndexedDbTable.make(
  "todo",
  Schema.Struct({
    id: Schema.Number,
    title: Schema.String,
    count: Schema.Number,
    completed: Schema.Boolean
  }),
  { keyPath: "id", indexes: { titleIndex: "title", countIndex: "count" } }
) {}

const Table2 = IndexedDbTable.make(
  "user",
  Schema.Struct({
    name: Schema.String,
    email: Schema.String
  })
)

const Table3 = IndexedDbTable.make(
  "product",
  Schema.Struct({
    name: Schema.String,
    price: Schema.Number
  }),
  { autoIncrement: true }
)

const Table4 = IndexedDbTable.make(
  "price",
  Schema.Struct({
    id: Schema.String,
    amount: Schema.Number
  }),
  { keyPath: "id", autoIncrement: true }
)

class Db extends IndexedDbVersion.make(Table1, Table2, Table3, Table4) {}

describe("IndexedDbQueryBuilder", () => {
  describe("select", () => {
    it.effect("select", () =>
      Effect.gen(function*() {
        {
          const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
          const api = makeApi(Db)
          const from = api.from("todo")
          const select = from.select()
          const data = yield* select

          assert.equal(from.table, "todo")
          assert.deepStrictEqual(from.source, Db)
          assert.equal(select.index, undefined)
          assert.deepStrictEqual(select.from, from)
          assert.deepStrictEqual(select.from.IDBKeyRange, IDBKeyRange)
          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [{ id: 1, title: "test", count: 1, completed: false }])

          // Close database to avoid errors when running other tests (blocked access)
          yield* use(async (database) => database.close())
        }
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insert({ id: 1, title: "test", count: 1, completed: false })
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select with index", () =>
      Effect.gen(function*() {
        {
          const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
          const api = makeApi(Db)
          const from = api.from("todo")
          const select = from.select("titleIndex")
          const data = yield* select

          assert.equal(from.table, "todo")
          assert.deepStrictEqual(from.source, Db)
          assert.equal(select.index, "titleIndex")
          assert.deepStrictEqual(select.from, from)
          assert.deepStrictEqual(select.from.IDBKeyRange, IDBKeyRange)
          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [{ id: 2, title: "test2", count: 2, completed: false }])

          // Close database to avoid errors when running other tests (blocked access)
          yield* use(async (database) => database.close())
        }
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db2",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insert({ id: 2, title: "test2", count: 2, completed: false })
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select equals", () =>
      Effect.gen(function*() {
        {
          const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
          const api = makeApi(Db)
          const from = api.from("todo")
          const select = from.select()
          const equals = select.equals(2)
          const data = yield* equals

          assert.equal(from.table, "todo")
          assert.deepStrictEqual(from.source, Db)
          assert.equal(equals.index, undefined)
          assert.deepStrictEqual(equals.from, from)
          assert.deepStrictEqual(equals.from.IDBKeyRange, IDBKeyRange)
          assert.equal(equals.only, 2)
          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [{ id: 2, title: "test2", count: 2, completed: false }])

          // Close database to avoid errors when running other tests (blocked access)
          yield* use(async (database) => database.close())
        }
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db3",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select equals with index", () =>
      Effect.gen(function*() {
        {
          const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
          const api = makeApi(Db)
          const from = api.from("todo")
          const select = from.select("titleIndex")
          const equals = select.equals("test3")
          const data = yield* equals

          assert.equal(from.table, "todo")
          assert.deepStrictEqual(from.source, Db)
          assert.equal(equals.index, "titleIndex")
          assert.deepStrictEqual(equals.from, from)
          assert.deepStrictEqual(equals.from.IDBKeyRange, IDBKeyRange)
          assert.equal(equals.only, "test3")
          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])

          // Close database to avoid errors when running other tests (blocked access)
          yield* use(async (database) => database.close())
        }
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db4",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select gte", () =>
      Effect.gen(function*() {
        {
          const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
          const api = makeApi(Db)
          const data = yield* api.from("todo").select().gte(2)

          assert.equal(data.length, 2)
          assert.deepStrictEqual(data, [
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])

          // Close database to avoid errors when running other tests (blocked access)
          yield* use(async (database) => database.close())
        }
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db5",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select gte with index", () =>
      Effect.gen(function*() {
        {
          const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
          const api = makeApi(Db)
          const data = yield* api.from("todo").select("countIndex").gte(3)

          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [
            { id: 3, title: "test3", count: 3, completed: false }
          ])

          // Close database to avoid errors when running other tests (blocked access)
          yield* use(async (database) => database.close())
        }
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db5-4",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select lte", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().lte(2)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 1, title: "test1", count: 1, completed: false },
          { id: 2, title: "test2", count: 2, completed: false }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db6",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select gt", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().gt(2)

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db7",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select lt", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().lt(2)

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 1, title: "test1", count: 1, completed: false }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db8",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select between", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().between(2, 3)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db9",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select between with exclude", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().between(2, 4, {
          excludeLowerBound: true,
          excludeUpperBound: true
        })

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db10",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select limit", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().limit(2)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 1, title: "test1", count: 1, completed: false },
          { id: 2, title: "test2", count: 2, completed: false }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db11",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select limit with filters", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select("countIndex").gte(2).limit(2)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db11-8",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select first", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select().first()

        assert.deepStrictEqual(data, { id: 1, title: "test1", count: 1, completed: false })
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db12",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("select first with filters", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const data = yield* api.from("todo").select("titleIndex").equals("test2").first()

        assert.deepStrictEqual(data, { id: 2, title: "test2", count: 2, completed: false })
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db13",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))
  })

  describe("modify", () => {
    it.effect("insert", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKey = yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
        const data = yield* api.from("todo").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 10, title: "insert1", count: 10, completed: true }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db14",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("insert with manual key required", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKey = yield* api.from("user").insert({
          key: 10,
          name: "insert1",
          email: "insert1@example.com"
        })
        const data = yield* api.from("user").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ name: "insert1", email: "insert1@example.com" }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db112",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createObjectStore("user")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("insert with manual key optional", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKey = yield* api.from("product").insert({
          key: "10",
          name: "insert1",
          price: 10
        })
        const data = yield* api.from("product").select()

        assert.equal(addedKey, "10")
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ name: "insert1", price: 10 }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db1121",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createObjectStore("user")
                    yield* api.createObjectStore("product")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("insert with auto-increment", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKey = yield* api.from("price").insertAll([
          { amount: 10 },
          { amount: 20, id: "uuid" },
          { amount: 30 }
        ])
        const data = yield* api.from("price").select()

        assert.deepStrictEqual(addedKey, [1, "uuid", 2])
        assert.equal(data.length, 3)
        assert.deepStrictEqual(data, [
          { id: 1, amount: 10 },
          { id: 2, amount: 30 },
          { id: "uuid", amount: 20 }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db11211",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createObjectStore("user")
                    yield* api.createObjectStore("product")
                    yield* api.createObjectStore("price")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("insert with auto-increment and get first", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKey = yield* api.from("price").insert(
          { amount: 10 }
        )
        const data = yield* api.from("price").select().first()

        assert.equal(addedKey, 1)
        assert.deepStrictEqual(data, { id: 1, amount: 10 })
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db112112",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createObjectStore("user")
                    yield* api.createObjectStore("product")
                    yield* api.createObjectStore("price")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("upsert", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKey = yield* api.from("todo").upsert({ id: 10, title: "update1", count: -10, completed: false })
        const data = yield* api.from("todo").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 10, title: "update1", count: -10, completed: false }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db14",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("delete", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        yield* api.from("todo").delete().equals(10)
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 11, title: "insert2", count: 11, completed: true }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db15",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 10, title: "insert1", count: 10, completed: true },
                      { id: 11, title: "insert2", count: 11, completed: true }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("delete with limit", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        yield* api.from("todo").delete().limit(1)
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 11, title: "insert2", count: 11, completed: true }])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db15-2",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 10, title: "insert1", count: 10, completed: true },
                      { id: 11, title: "insert2", count: 11, completed: true }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("clear", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        yield* api.from("todo").clear
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 0)
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db16",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 10, title: "insert1", count: 10, completed: true },
                      { id: 11, title: "insert2", count: 11, completed: true }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))
  })

  describe("modify all", () => {
    it.effect("insertAll", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKeys = yield* api.from("todo").insertAll([
          { id: 10, title: "insert1", count: 10, completed: true },
          { id: 11, title: "insert2", count: 11, completed: true }
        ])
        const data = yield* api.from("todo").select()

        assert.deepStrictEqual(addedKeys, [10, 11])
        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 10, title: "insert1", count: 10, completed: true },
          { id: 11, title: "insert2", count: 11, completed: true }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db17",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("upsertAll", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKeys = yield* api.from("todo").upsertAll([
          { id: 10, title: "update1", count: -10, completed: false },
          { id: 11, title: "update2", count: -11, completed: false }
        ])
        const data = yield* api.from("todo").select()

        assert.deepStrictEqual(addedKeys, [10, 11])
        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 10, title: "update1", count: -10, completed: false },
          { id: 11, title: "update2", count: -11, completed: false }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db18",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insertAll([
                      { id: 10, title: "insert1", count: 10, completed: true },
                      { id: 11, title: "insert2", count: 11, completed: true }
                    ])
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("upsertAll same key", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const addedKeys = yield* api.from("todo").upsertAll([
          { id: 10, title: "update1", count: -10, completed: false },
          { id: 10, title: "update2", count: -11, completed: false }
        ])
        const data = yield* api.from("todo").select()

        assert.deepStrictEqual(addedKeys, [10, 10])
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [
          { id: 10, title: "update2", count: -11, completed: false }
        ])
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db19",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))

    it.effect("clearAll", () =>
      Effect.gen(function*() {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        yield* api.clearAll
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 0)
      }).pipe(
        Effect.provide(
          IndexedDbQuery.layer.pipe(
            Layer.provide(
              IndexedDbDatabase.layer(
                "db20",
                IndexedDbMigration.make(Db, (api) =>
                  Effect.gen(function*() {
                    yield* api.createObjectStore("todo")
                    yield* api.createIndex("todo", "titleIndex")
                    yield* api.createIndex("todo", "countIndex")
                    yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
                  }))
              ).pipe(Layer.provide(layerFakeIndexedDb))
            )
          )
        )
      ))
  })

  it.effect("count", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").count()

      assert.equal(data, 3)

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db13-2",
              IndexedDbMigration.make(Db, (api) =>
                Effect.gen(function*() {
                  yield* api.createObjectStore("todo")
                  yield* api.createIndex("todo", "titleIndex")
                  yield* api.createIndex("todo", "countIndex")
                  yield* api.from("todo").insertAll([
                    { id: 1, title: "test1", count: 1, completed: false },
                    { id: 2, title: "test2", count: 2, completed: false },
                    { id: 3, title: "test3", count: 3, completed: false }
                  ])
                }))
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("count with filters", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").count("titleIndex").equals("test2")

      assert.equal(data, 1)

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db13-1",
              IndexedDbMigration.make(Db, (api) =>
                Effect.gen(function*() {
                  yield* api.createObjectStore("todo")
                  yield* api.createIndex("todo", "titleIndex")
                  yield* api.createIndex("todo", "countIndex")
                  yield* api.from("todo").insertAll([
                    { id: 1, title: "test1", count: 1, completed: false },
                    { id: 2, title: "test2", count: 2, completed: false },
                    { id: 3, title: "test3", count: 3, completed: false }
                  ])
                }))
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))
})
