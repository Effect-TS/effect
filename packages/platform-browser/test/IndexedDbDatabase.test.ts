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
    completed: Schema.Boolean
  }),
  { keyPath: "id" }
)

const Db = IndexedDbVersion.make(Table)

describe("IndexedDbDatabase", () => {
  it.effect("insert and read todos", () =>
    Effect.gen(function*() {
      const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
      const api = makeApi(Db)
      const todo = yield* api.getAll("todo")
      assert.deepStrictEqual(todo, [{ id: 1, title: "test", completed: false }])
    }).pipe(
      Effect.provide(
        IndexedDbQuery.layer.pipe(
          Layer.provide(
            Layer.unwrapEffect(
              Effect.gen(function*() {
                return IndexedDbDatabase.layer(
                  "db",
                  IndexedDbMigration.make({
                    fromVersion: IndexedDbVersion.makeEmpty,
                    toVersion: Db,
                    execute: (_, toQuery) =>
                      Effect.gen(function*() {
                        yield* toQuery.createObjectStore("todo")
                        yield* toQuery.insert("todo", {
                          id: 1,
                          title: "test",
                          completed: false
                        })
                      })
                  })
                )
              })
            )
          ),
          Layer.provide([layerFakeIndexedDb])
        )
      )
    ))
})
