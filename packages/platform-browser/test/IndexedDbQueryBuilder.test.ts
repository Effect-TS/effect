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
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const layerFakeIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))

const Table = IndexedDbTable.make(
  "todo",
  Schema.Struct({
    id: Schema.Number,
    title: Schema.String,
    count: Schema.Number,
    completed: Schema.Boolean
  }),
  { keyPath: "id", indexes: { titleIndex: "title", countIndex: "count" } }
)

const Db = IndexedDbVersion.make(Table)

describe("IndexedDbQueryBuilder", () => {
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
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insert("todo", { id: 1, title: "test", count: 1, completed: false })
                  })
              })
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
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insert("todo", { id: 2, title: "test2", count: 2, completed: false })
                  })
              })
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
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
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
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
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
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select lte", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().lte(2)

      assert.equal(data.length, 2)
      assert.deepStrictEqual(data, [
        { id: 1, title: "test1", count: 1, completed: false },
        { id: 2, title: "test2", count: 2, completed: false }
      ])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db6",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select gt", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().gt(2)

      assert.equal(data.length, 1)
      assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db7",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select lt", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().lt(2)

      assert.equal(data.length, 1)
      assert.deepStrictEqual(data, [{ id: 1, title: "test1", count: 1, completed: false }])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db8",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select between", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().between(2, 3)

      assert.equal(data.length, 2)
      assert.deepStrictEqual(data, [
        { id: 2, title: "test2", count: 2, completed: false },
        { id: 3, title: "test3", count: 3, completed: false }
      ])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db9",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select between with exclude", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().between(2, 4, { excludeLowerBound: true, excludeUpperBound: true })

      assert.equal(data.length, 1)
      assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db10",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select limit", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().limit(1)

      assert.equal(data.length, 1)
      assert.deepStrictEqual(data, [{ id: 1, title: "test1", count: 1, completed: false }])

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db11",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false },
                      { id: 4, title: "test4", count: 4, completed: false },
                      { id: 5, title: "test5", count: 5, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select limit", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select().first()

      assert.deepStrictEqual(data, { id: 1, title: "test1", count: 1, completed: false })

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db12",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))

  it.effect("select limit with filters", () =>
    Effect.gen(function*() {
      const { makeApi, use } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const data = yield* api.from("todo").select("titleIndex").equals("test2").first()

      assert.deepStrictEqual(data, { id: 2, title: "test2", count: 2, completed: false })

      // Close database to avoid errors when running other tests (blocked access)
      yield* use(async (database) => database.close())
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            IndexedDbDatabase.layer(
              "db13",
              IndexedDbMigration.make({
                fromVersion: IndexedDbVersion.makeEmpty,
                toVersion: Db,
                execute: (_, toQuery) =>
                  Effect.gen(function*() {
                    yield* toQuery.createObjectStore("todo")
                    yield* toQuery.createIndex("todo", "titleIndex")
                    yield* toQuery.createIndex("todo", "countIndex")
                    yield* toQuery.insertAll("todo", [
                      { id: 1, title: "test1", count: 1, completed: false },
                      { id: 2, title: "test2", count: 2, completed: false },
                      { id: 3, title: "test3", count: 3, completed: false }
                    ])
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))
})
