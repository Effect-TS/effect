import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const Rows = IndexedDbTable.make({
  name: "rows",
  schema: Schema.Struct({ id: Schema.Number }),
  keyPath: "id"
})
const Db = IndexedDbDatabase.make(
  IndexedDbVersion.make(Rows),
  (api) => api.createObjectStore("rows").pipe(Effect.asVoid)
)
const layerIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))
const sequence = (from: number, count: number) => Array.from({ length: count }, (_, index) => from + index)

const cases: ReadonlyArray<{
  readonly name: string
  readonly rows: number
  readonly limit?: number
  readonly chunkSize?: number
  readonly offset?: number
  readonly reverse?: boolean
  readonly expected: ReadonlyArray<number>
}> = [
  { name: "non-aligned", rows: 4, limit: 3, chunkSize: 2, expected: [1, 2, 3] },
  { name: "default chunk size", rows: 220, limit: 150, expected: sequence(1, 150) },
  { name: "aligned", rows: 4, limit: 4, chunkSize: 2, expected: [1, 2, 3, 4] },
  { name: "less than a page", rows: 4, limit: 1, chunkSize: 2, expected: [1] },
  { name: "fewer rows", rows: 4, limit: 7, chunkSize: 2, expected: [1, 2, 3, 4] },
  { name: "offset", rows: 220, offset: 3, limit: 150, expected: sequence(4, 150) },
  { name: "reverse", rows: 4, limit: 3, chunkSize: 2, reverse: true, expected: [4, 3, 2] },
  {
    name: "offset and reverse",
    rows: 220,
    limit: 150,
    offset: 3,
    reverse: true,
    expected: sequence(68, 150).reverse()
  },
  { name: "unlimited", rows: 4, chunkSize: 2, expected: [1, 2, 3, 4] }
]

for (const [index, test] of cases.entries()) {
  it.effect(`keeps streamed selects within limits: ${test.name}`, () =>
    Effect.gen(function*() {
      const databaseName = `indexeddb-stream-limit-regression-${index}`
      // Scope cleanup also runs for a failed assertion. Effect.provide closes the
      // database connection before this outer test finalizer deletes the fixture.
      yield* Effect.addFinalizer(() =>
        Effect.callback<void>((resume) => {
          const request = indexedDB.deleteDatabase(databaseName)
          request.onsuccess = () => resume(Effect.void)
          request.onerror = () => resume(Effect.die(request.error))
          request.onblocked = () => resume(Effect.die(new Error("Fixture database remained open")))
        })
      )
      yield* Effect.gen(function*() {
        const api = yield* Db
        const rows = api.from("rows")
        yield* rows.insertAll(sequence(1, test.rows).map((id) => ({ id })))
        const base = rows.select()
        const directional = test.reverse ? base.reverse() : base
        const offset = test.offset === undefined ? directional : directional.offset(test.offset)
        const select = test.limit === undefined ? offset : offset.limit(test.limit)
        const stream = select.stream({ chunkSize: test.chunkSize })

        const direct = yield* select
        const first = yield* Stream.runCollect(stream)
        const replay = yield* Stream.runCollect(stream)
        assert.deepStrictEqual(direct.map((row) => row.id), test.expected)
        assert.deepStrictEqual(first.map((row) => row.id), test.expected)
        assert.deepStrictEqual(replay.map((row) => row.id), test.expected)
        assert.strictEqual(new Set(first.map((row) => row.id)).size, first.length)
      }).pipe(Effect.provide(Db.layer(databaseName).pipe(Layer.provide(layerIndexedDb))))
    }))
}
