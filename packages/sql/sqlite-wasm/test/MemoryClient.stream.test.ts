import { SqliteClient } from "@effect/sql-sqlite-wasm"
import { assert, describe, it } from "@effect/vitest"
import * as WaSqlite from "@effect/wa-sqlite"
import type SQLiteESMFactory from "@effect/wa-sqlite/dist/wa-sqlite.mjs"
import { Cause, Deferred, Effect, Exit, Fiber, Scope, Stream } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { vi } from "vitest"

// Supply local bytes instead of the browser loader's fetch. The module, SQLite
// factory, statement generators and MemoryVFS are all the installed real code.
vi.mock("@effect/wa-sqlite/dist/wa-sqlite.mjs", async (importOriginal) => {
  const { default: createModule } = await importOriginal<{ default: typeof SQLiteESMFactory }>()
  const { readFileSync } = await import("node:fs")
  const { createRequire } = await import("node:module")
  const wasmBinary = readFileSync(createRequire(import.meta.url).resolve("@effect/wa-sqlite/dist/wa-sqlite.wasm"))
  return { default: () => createModule({ wasmBinary }) }
})

vi.mock("@effect/wa-sqlite", async (importOriginal) => {
  const actual = await importOriginal<typeof WaSqlite>()
  return { ...actual, Factory: vi.fn(actual.Factory) }
})

interface Row {
  readonly n: number
  readonly label: string
  readonly payload: Uint8Array
}

const makeClient = (count = 5000, options: SqliteClient.SqliteClientMemoryConfig = {}) =>
  Effect.gen(function*() {
    // A local scope lets each test observe DROP and database close separately.
    const scope = yield* Scope.fork(yield* Effect.scope)
    const sql = yield* SqliteClient.makeMemory(options).pipe(Scope.provide(scope))
    const factory = vi.mocked(WaSqlite.Factory).mock.results[0]
    assert(factory.type === "return")
    const api = factory.value
    const nativeClose: (db: number) => number = vi.mocked(WaSqlite.Factory).mock.calls[0][0].cwrap(
      "sqlite3_close",
      "number",
      ["number"]
    )
    const statements = vi.spyOn(api, "statements")
    const step = vi.spyOn(api, "step")
    const finalize = vi.spyOn(api, "finalize")
    const close = vi.spyOn(api, "close")

    yield* Effect.addFinalizer(() =>
      Scope.close(scope, Exit.void).pipe(
        Effect.exit,
        Effect.andThen(Effect.sync(() => {
          try {
            // After observing the product exits, recover only this test's own
            // leaked iterators on a failing implementation. Never hide a failed
            // DROP/close or let a baseline failure leak into the next test.
            for (const result of statements.mock.results) {
              if (result.type === "return") result.value[Symbol.iterator]().return?.()
            }
            for (let i = 0; i < close.mock.results.length; i++) {
              // WA-SQLite forgets the handle even when close reports BUSY.
              // Only failed-test recovery uses the native binding directly.
              if (close.mock.results[i].type === "throw") {
                assert.strictEqual(nativeClose(close.mock.calls[i][0]), WaSqlite.SQLITE_OK)
              }
            }
          } finally {
            statements.mockRestore()
            step.mockRestore()
            finalize.mockRestore()
            close.mockRestore()
          }
        }))
      )
    )

    yield* sql`CREATE TABLE items (n INTEGER NOT NULL, label TEXT NOT NULL, payload BLOB NOT NULL)`
    if (count > 0) {
      yield* sql`WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM nums WHERE n < ${count})
        INSERT INTO items SELECT n, 'row-' || n, X'00FF1180' FROM nums`
    }
    const db = statements.mock.calls[0][0]
    statements.mockClear()
    step.mockClear()
    finalize.mockClear()

    const snapshot = () => ({
      iterators: statements.mock.results.map((result) => {
        assert(result.type === "return")
        return result.value
      }),
      rowsRead: step.mock.results.filter((result) => result.type === "return" && result.value === WaSqlite.SQLITE_ROW)
        .length,
      finalized: finalize.mock.calls.length
    })
    const cleanup = Effect.gen(function*() {
      const remaining = yield* sql`SELECT COUNT(*) FROM items`.values
      const drop = yield* sql`DROP TABLE items`.pipe(Effect.exit)
      const closed = yield* Scope.close(scope, Exit.void).pipe(Effect.exit)
      return { remaining, drop, closed }
    })

    return { sql, api, db, snapshot, cleanup }
  })

const assertClean = (
  result: Effect.Success<Effect.Success<ReturnType<typeof makeClient>>["cleanup"]>,
  count = 5000
) => {
  assert.deepStrictEqual(result.remaining, [[count]], "streaming must retain the stored rows")
  assert.deepStrictEqual(
    { drop: result.drop, closed: result.closed },
    { drop: Exit.succeed([]), closed: Exit.void },
    "the finished stream must release its statement before DROP and client close"
  )
}

const assertRows = (rows: ReadonlyArray<Row>, count: number) => {
  assert.strictEqual(rows.length, count)
  for (let i = 0; i < rows.length; i++) {
    assert.deepStrictEqual(rows[i], { n: i + 1, label: `row-${i + 1}`, payload: new Uint8Array([0, 255, 17, 128]) })
  }
  assert.strictEqual(new Set(rows).size, count)
  assert.strictEqual(new Set(rows.map((row) => row.payload)).size, count)
  assert.strictEqual(new Set(rows.map((row) => row.payload.buffer)).size, count)
}

// The adapter caches its native factory. Keep pass-through spies test-local and
// restore them before the next case, even with the root's concurrent default.
describe.sequential("memory client streams (native SQLite WASM)", () => {
  it.effect("executes native SQL and closes an idle client", () =>
    Effect.gen(function*() {
      const client = yield* makeClient(0)
      assert.deepStrictEqual(yield* client.sql`SELECT 42 AS answer`, [{ answer: 42 }])
      const version = yield* client.sql<{ version: string }>`SELECT sqlite_version() AS version`
      assert.match(version[0].version, /^\d+\.\d+\.\d+$/)
      assertClean(yield* client.cleanup, 0)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("does not acquire a statement when constructed or taken zero times", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const stream = client.sql<Row>`SELECT n, label, payload FROM items`.stream
      assert.deepStrictEqual(client.snapshot(), { iterators: [], rowsRead: 0, finalized: 0 })
      assert.deepStrictEqual(yield* stream.pipe(Stream.take(0), Stream.runCollect), [])
      const stats = client.snapshot()
      const cleanup = yield* client.cleanup
      assert.deepStrictEqual(stats, { iterators: [], rowsRead: 0, finalized: 0 })
      assertClean(cleanup)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("releases an early take beyond the default 4096-row buffer without draining", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const rows = yield* client.sql<Row>`SELECT n, label, payload FROM items WHERE n >= ${1}`.stream.pipe(
        Stream.take(1),
        Stream.runCollect
      )
      const stats = client.snapshot()
      const cleanup = yield* client.cleanup
      assertRows(rows, 1)
      assert(stats.rowsRead > 0 && stats.rowsRead < 5000, "cleanup must not drain the remaining native rows")
      assertClean(cleanup)
      assert.strictEqual(stats.finalized, 1)
      assert.strictEqual(stats.iterators.length, 1)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("fully consumes multiple chunks and finalizes only once", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const rows = yield* Stream.runCollect(client.sql<Row>`SELECT n, label, payload FROM items`.stream)
      const stats = client.snapshot()
      const cleanup = yield* client.cleanup
      assertRows(rows, 5000)
      assertClean(cleanup)
      assert.strictEqual(stats.rowsRead, 5000)
      assert.strictEqual(stats.finalized, 1)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("exhausts a one-row query during the first pull", () =>
    Effect.gen(function*() {
      const client = yield* makeClient(1)
      const rows = yield* client.sql<Row>`SELECT n, label, payload FROM items`.stream.pipe(
        Stream.take(1),
        Stream.runCollect
      )
      const stats = client.snapshot()
      const cleanup = yield* client.cleanup
      assertRows(rows, 1)
      assertClean(cleanup, 1)
      assert.strictEqual(stats.rowsRead, 1)
      assert.strictEqual(stats.finalized, 1)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("finalizes an empty query", () =>
    Effect.gen(function*() {
      const client = yield* makeClient(0)
      const rows = yield* Stream.runCollect(client.sql<Row>`SELECT n, label, payload FROM items`.stream)
      const stats = client.snapshot()
      const cleanup = yield* client.cleanup
      assertRows(rows, 0)
      assertClean(cleanup, 0)
      assert.strictEqual(stats.rowsRead, 0)
      assert.strictEqual(stats.finalized, 1)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("uses a fresh iterator on each execution of the same stream", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const stream = client.sql<Row>`SELECT n, label, payload FROM items`.stream
      const first = yield* stream.pipe(Stream.take(1), Stream.runCollect)
      const second = yield* stream.pipe(Stream.take(1), Stream.runCollect)
      const stats = client.snapshot()
      const cleanup = yield* client.cleanup
      assertRows(first, 1)
      assertRows(second, 1)
      assert.notStrictEqual(first[0], second[0])
      assert.notStrictEqual(first[0].payload, second[0].payload)
      assert.notStrictEqual(first[0].payload.buffer, second[0].payload.buffer)
      assertClean(cleanup)
      assert.strictEqual(stats.iterators.length, 2)
      assert.notStrictEqual(stats.iterators[0], stats.iterators[1])
      assert.strictEqual(stats.finalized, 2)
      assert(stats.rowsRead < 10000)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("releases on downstream failure without replacing the original error", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const marker = { _tag: "DownstreamFailure" }
      const seen: Array<Row> = []
      const exit = yield* client.sql<Row>`SELECT n, label, payload FROM items`.stream.pipe(
        Stream.mapEffect((row) => {
          seen.push(row)
          return Effect.fail(marker)
        }),
        Stream.runCollect,
        Effect.exit
      )
      const cleanup = yield* client.cleanup
      assertRows(seen, 1)
      assert.deepStrictEqual(exit, Exit.fail(marker))
      assert(Exit.isFailure(exit))
      assert.strictEqual(Cause.squash(exit.cause), marker)
      assertClean(cleanup)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("releases when a child scope interrupts the stream", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const ready = yield* Deferred.make<void>()
      const seen: Array<Row> = []
      const scope = yield* Scope.fork(yield* Effect.scope)
      const fiber = yield* client.sql<Row>`SELECT n, label, payload FROM items`.stream.pipe(
        Stream.mapEffect((row) => {
          seen.push(row)
          return Effect.andThen(Deferred.succeed(ready, undefined), Effect.never)
        }),
        Stream.runCollect,
        Effect.forkScoped,
        Scope.provide(scope)
      )
      yield* Deferred.await(ready)
      yield* Scope.close(scope, Exit.void)
      const exit = yield* Fiber.await(fiber)
      const cleanup = yield* client.cleanup
      assertRows(seen, 1)
      assert(Exit.isFailure(exit))
      assert(Cause.hasInterrupts(exit.cause))
      assert(!Cause.hasFails(exit.cause))
      assert(!Cause.hasDies(exit.cause))
      assertClean(cleanup)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("preserves transformed names, bound values and independent BLOBs", () =>
    Effect.gen(function*() {
      const client = yield* makeClient(5000, { transformResultNames: (name) => name.toUpperCase() })
      const rows = yield* Stream.runCollect(
        client.sql<{ N: number; LABEL: string; PAYLOAD: Uint8Array }>`
          SELECT n, label, payload FROM items WHERE n >= ${1}`.stream
      )
      const cleanup = yield* client.cleanup
      for (const row of rows) assert.deepStrictEqual(Object.keys(row).sort(), ["LABEL", "N", "PAYLOAD"])
      assertRows(rows.map((row) => ({ n: row.N, label: row.LABEL, payload: row.PAYLOAD })), 5000)
      assert.strictEqual(new Set(rows).size, 5000)
      assertClean(cleanup)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("native iterator return releases its lock and is idempotent", () =>
    Effect.gen(function*() {
      const client = yield* makeClient()
      const iterator = client.api.statements(client.db, "SELECT n FROM items")[Symbol.iterator]()
      const next = iterator.next()
      assert(!next.done)
      assert.strictEqual(client.api.step(next.value), WaSqlite.SQLITE_ROW)
      assert.deepStrictEqual(client.api.row(next.value), [1])
      const locked = yield* client.sql`DROP TABLE items`.pipe(Effect.exit)
      assert(Exit.isFailure(locked))
      const error = Cause.findErrorOption(locked.cause)
      assert(error._tag === "Some")
      assert.strictEqual(error.value.reason._tag, "LockTimeoutError")
      const before = client.snapshot().finalized
      iterator.return?.()
      assert.strictEqual(client.snapshot().finalized, before + 1)
      iterator.return?.()
      assert.strictEqual(client.snapshot().finalized, before + 1)
      assertClean(yield* client.cleanup)
    }).pipe(Effect.provide(Reactivity.layer)))
})
