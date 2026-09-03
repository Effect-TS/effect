import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Layer, Schema } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const Out = IndexedDbTable.make({
  name: "out",
  schema: Schema.Struct({ label: Schema.String, rank: Schema.Number }),
  indexes: { labelIndex: "label" }
})
const Inline = IndexedDbTable.make({
  name: "inline",
  schema: Schema.Struct({ id: Schema.Number, label: Schema.String }),
  keyPath: "id"
})
const KeyKinds = IndexedDbTable.make({
  name: "key-kinds",
  schema: Schema.Struct({ label: Schema.String, rank: Schema.Number }),
  indexes: { labelIndex: "label", compoundIndex: ["label", "rank"] }
})
const Db = IndexedDbDatabase.make(
  IndexedDbVersion.make(Out, Inline, KeyKinds),
  Effect.fn(function*(api) {
    yield* api.createObjectStore("out")
    yield* api.createIndex("out", "labelIndex")
    yield* api.createObjectStore("inline")
    yield* api.createObjectStore("key-kinds")
    yield* api.createIndex("key-kinds", "labelIndex")
    yield* api.createIndex("key-kinds", "compoundIndex")
  })
)
const databaseName = "indexeddb-out-of-line-primary-key-regression"
const layer = Db.layer(databaseName).pipe(Layer.provide(Layer.succeed(
  IndexedDb.IndexedDb,
  IndexedDb.make({ indexedDB, IDBKeyRange })
)))

it.effect("preserves out-of-line primary keys in first and array queries", () =>
  Effect.gen(function*() {
    // it.effect owns this Scope. The provided database layer closes before this
    // finalizer deletes the fixture, including when an assertion fails.
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
      const rows = api.from("out")
      const inline = api.from("inline")
      const seven = { key: 7, label: "seven", rank: 7 }
      const nine = { key: 9, label: "nine", rank: 9 }
      const eleven = { key: 11, label: "eleven", rank: 11 }
      const thirteen = { key: 13, label: "nine", rank: 13 }
      yield* rows.insert(seven)
      yield* rows.insertAll([nine, eleven, thirteen])
      yield* inline.insert({ id: 7, label: "seven" })

      assert.deepStrictEqual(yield* rows.select().equals(7), [seven])
      assert.deepStrictEqual(yield* rows.select().first(), seven)
      assert.deepStrictEqual(yield* rows.select().equals(7).first(), seven)
      assert.deepStrictEqual(yield* inline.select().equals(7).first(), { id: 7, label: "seven" })
      assert.instanceOf(yield* Effect.flip(rows.select().equals(8).first()), Cause.NoSuchElementError)
      assert.instanceOf(yield* Effect.flip(inline.select().equals(8).first()), Cause.NoSuchElementError)

      // Two matching index keys: the returned key must be the first primary key,
      // not the index key "nine" and not the other matching primary key 13.
      assert.deepStrictEqual(yield* rows.select("labelIndex").equals("nine").first(), nine)
      assert.deepStrictEqual(yield* rows.select("labelIndex").gte("nine").first(), nine)
      assert.deepStrictEqual(
        yield* rows.select("labelIndex").between("eleven", "seven", { excludeLowerBound: true }).first(),
        nine
      )
      assert.deepStrictEqual(yield* rows.select("labelIndex").lte("nine").first(), eleven)
      assert.instanceOf(
        yield* Effect.flip(rows.select("labelIndex").equals("absent").first()),
        Cause.NoSuchElementError
      )

      // These public chains exclude first(); keep them as array-query controls.
      assert.deepStrictEqual(yield* rows.select().filter((row) => row.rank >= 9), [nine, eleven, thirteen])
      assert.deepStrictEqual(yield* rows.select().reverse().limit(2), [thirteen, eleven])
      assert.deepStrictEqual(yield* rows.select().offset(1).limit(2), [nine, eleven])
      assert.deepStrictEqual(yield* rows.select().offset(4), [])

      // Index ordering is unchanged, but row.key must always identify the row,
      // including non-unique secondary index values and unbounded first reads.
      assert.deepStrictEqual(yield* rows.select("labelIndex").first(), eleven)
      assert.deepStrictEqual(yield* rows.select("labelIndex"), [eleven, nine, thirteen, seven])
      assert.deepStrictEqual(yield* rows.select("labelIndex").equals("nine"), [nine, thirteen])
      assert.deepStrictEqual(yield* rows.select("labelIndex").gte("nine").limit(2), [nine, thirteen])
      assert.deepStrictEqual(
        yield* rows.select("labelIndex").between("eleven", "seven", { excludeLowerBound: true }),
        [nine, thirteen, seven]
      )
      assert.deepStrictEqual(yield* rows.select("labelIndex").limit(2), [eleven, nine])
      assert.deepStrictEqual(yield* rows.select("labelIndex").reverse().limit(3), [seven, thirteen, nine])
      assert.deepStrictEqual(yield* rows.select("labelIndex").offset(1).limit(2), [nine, thirteen])
      assert.deepStrictEqual(yield* rows.select("labelIndex").filter((row) => row.rank >= 9), [eleven, nine, thirteen])
      assert.deepStrictEqual(yield* rows.select("labelIndex").equals("absent"), [])

      const keyed = api.from("key-kinds")
      const typedRows: Array<{ key: IDBValidKey; label: string; rank: number }> = [
        { key: 42, label: "number", rank: 1 },
        { key: "primary", label: "string", rank: 1 },
        { key: new Date("2020-01-02T00:00:00.000Z"), label: "date", rank: 1 },
        { key: new Uint8Array([0, 2, 4]).buffer, label: "binary", rank: 1 },
        { key: ["tenant", 1], label: "pair", rank: 1 },
        { key: ["tenant", 2], label: "pair", rank: 1 }
      ]
      yield* keyed.insertAll(typedRows)
      for (const expected of typedRows) {
        const direct = yield* keyed.select().equals(expected.key)
        const first = yield* keyed.select().equals(expected.key).first()
        assert.strictEqual(direct.length, 1)
        assert.strictEqual(indexedDB.cmp(direct[0].key, expected.key), 0)
        assert.strictEqual(indexedDB.cmp(first.key, expected.key), 0)
        assert.strictEqual(first.label, expected.label)
      }
      const unbounded = yield* keyed.select("labelIndex").first()
      assert.strictEqual(indexedDB.cmp(unbounded.key, new Uint8Array([0, 2, 4]).buffer), 0)
      const pairs = yield* keyed.select("labelIndex").equals("pair")
      const compound = yield* keyed.select("compoundIndex").equals(["pair", 1])
      assert.deepStrictEqual(pairs.map((row) => row.key), [["tenant", 1], ["tenant", 2]])
      assert.deepStrictEqual(compound.map((row) => row.key), [["tenant", 1], ["tenant", 2]])
      assert.deepStrictEqual((yield* keyed.select("compoundIndex").equals(["pair", 1]).first()).key, ["tenant", 1])
      assert.deepStrictEqual(
        (yield* keyed.select("compoundIndex").equals(["pair", 1]).reverse().limit(1)).map((row) => row.key),
        [["tenant", 2]]
      )
      assert.instanceOf(
        yield* Effect.flip(keyed.select("compoundIndex").equals(["missing", 1]).first()),
        Cause.NoSuchElementError
      )
    }).pipe(Effect.provide(layer))
  }))
