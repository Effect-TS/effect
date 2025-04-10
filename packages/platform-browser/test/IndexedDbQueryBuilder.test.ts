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
        const data = yield* api.from("todo").select()

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
        const data = yield* api.from("todo").select("titleIndex")

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
})
