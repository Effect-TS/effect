import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { afterEach, assert, it } from "@effect/vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const databaseName = "indexeddb-stream-limit"

const Rows = IndexedDbTable.make({
  name: "rows",
  schema: Schema.Struct({ id: Schema.Number }),
  keyPath: "id"
})
const Db = IndexedDbDatabase.make(
  IndexedDbVersion.make(Rows),
  Effect.fn(function*(api) {
    yield* api.createObjectStore("rows")
    yield* api.from("rows").insertAll([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])
  })
)
const layerIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))

afterEach(() => {
  indexedDB.deleteDatabase(databaseName)
})

it.effect("keeps streamed selects within a non-aligned limit", () =>
  Effect.gen(function*() {
    const api = yield* Db
    const rows = yield* api.from("rows").select().limit(3).stream({ chunkSize: 2 }).pipe(Stream.runCollect)

    assert.deepStrictEqual(rows.map((row) => row.id), [1, 2, 3])
  }).pipe(Effect.provide(Db.layer(databaseName).pipe(Layer.provide(layerIndexedDb)))))
