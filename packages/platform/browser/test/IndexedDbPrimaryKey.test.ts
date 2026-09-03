import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const databaseName = "indexeddb-primary-key"

afterEach(() => {
  indexedDB.deleteDatabase(databaseName)
})

const Records = IndexedDbTable.make({
  name: "records",
  schema: Schema.Struct({ label: Schema.String }),
  indexes: { label: "label" }
})

class Db extends IndexedDbDatabase.make(
  IndexedDbVersion.make(Records),
  Effect.fn(function*(api) {
    yield* api.createObjectStore("records")
    yield* api.createIndex("records", "label")
  })
) {}

const layer = Db.layer(databaseName).pipe(
  Layer.provide(Layer.succeed(
    IndexedDb.IndexedDb,
    IndexedDb.make({ indexedDB, IDBKeyRange })
  ))
)

const records = [
  { key: 7, label: "same" },
  { key: 9, label: "same" }
]

describe.sequential("out-of-line primary keys", () => {
  it.effect("preserves the primary key in first results", () =>
    Effect.gen(function*() {
      const db = yield* Db
      yield* db.from("records").insertAll(records)

      assert.deepStrictEqual(
        yield* db.from("records").select("label").equals("same").first(),
        records[0]
      )
    }).pipe(Effect.provide(layer)))

  it.effect("preserves primary keys in array results", () =>
    Effect.gen(function*() {
      const db = yield* Db
      yield* db.from("records").insertAll(records)

      assert.deepStrictEqual(
        yield* db.from("records").select("label").equals("same"),
        records
      )
    }).pipe(Effect.provide(layer)))
})
