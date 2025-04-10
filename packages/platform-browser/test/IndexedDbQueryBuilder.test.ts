import { IndexedDb } from "@effect/platform"
import {
  IndexedDbDatabase,
  IndexedDbMigration,
  IndexedDbQuery,
  IndexedDbTable,
  IndexedDbVersion
} from "@effect/platform-browser"
import { describe, it } from "@effect/vitest"
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
  it.effect("no index", () =>
    Effect.gen(function*() {
      {
        const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
        const api = makeApi(Db)
        const query = api.from("todo").select("countIndex")

        // assert.equal(query.table, "todo")
        // assert.equal(query.index, undefined)
        // assert.equal(query.only, undefined)
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
                  })
              })
            ).pipe(Layer.provide(layerFakeIndexedDb))
          )
        )
      )
    ))
})
