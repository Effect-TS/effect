import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { vi } from "vitest"

type Statement = {
  readonly columns: ReadonlyArray<string>
  readonly rows: ReadonlyArray<ReadonlyArray<unknown>>
}
type Database = {
  readonly sql: string
  readonly statements: ReadonlyArray<Statement>
  readonly releases: Array<string>
}
type Module = { database: Database }
type Cursor = Statement & { index: number }
type Payload = readonly [
  columns: ReadonlyArray<string> | undefined,
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  rowColumns?: ReadonlyArray<ReadonlyArray<string>>
]
type Fixture = {
  readonly name: string
  readonly sql: string
  readonly statements: ReadonlyArray<Statement>
  readonly objects: ReadonlyArray<unknown>
  readonly payload: Payload
}

// API-seam coverage, not native SQL. The mock supplies explicit per-statement
// cursors, never projected objects or result envelopes. Production OpfsWorker
// builds the envelope; production SqliteClient decodes it. Each factory owns
// its database/cursors, with a unique registry key per concurrent test case.
const databases = vi.hoisted(() => new Map<string, Database>())
vi.mock("@effect/wa-sqlite/dist/wa-sqlite.mjs", () => ({ default: async () => ({}) }))
vi.mock("@effect/wa-sqlite/src/examples/AccessHandlePoolVFS.js", () => ({
  AccessHandlePoolVFS: {
    create: async (_name: string, module: Module) => ({
      close: async () => {
        module.database.releases.push("vfs")
      }
    })
  }
}))
vi.mock("@effect/wa-sqlite", () => ({
  SQLITE_ROW: 100,
  Factory: (module: Module) => ({
    open_v2(name: string) {
      module.database = databases.get(name)!
      return 1
    },
    close() {
      module.database.releases.push("db")
    },
    vfs_register() {},
    *statements(_db: number, sql: string) {
      if (sql !== module.database.sql) throw new Error(`Unexpected SQL: ${sql}`)
      for (const statement of module.database.statements) yield { ...statement, index: -1 }
    },
    bind_collection() {},
    step(cursor: Cursor) {
      return ++cursor.index < cursor.rows.length ? 100 : 101
    },
    column_names: (cursor: Cursor) => [...cursor.columns],
    row: (cursor: Cursor) => structuredClone(cursor.rows[cursor.index])
  })
}))

import { OpfsWorker, SqliteClient } from "@effect/sql-sqlite-wasm"

// Always-active, dedicated-worker-like transport: startup is not under test.
// structuredClone preserves undefined, bytes and aliasing within each frame.
class Transport extends EventTarget {
  readonly sent: Array<ReadonlyArray<unknown>> = []
  readonly listeners = new Set<EventListenerOrEventListenerObject>()
  deliver: (message: ReadonlyArray<unknown>) => void = () => {}
  onListen: () => void = () => {}
  closed = false

  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    super.addEventListener(type, listener)
    if (type === "message" && listener) {
      this.listeners.add(listener)
      this.onListen()
    }
  }

  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    super.removeEventListener(type, listener)
    if (type === "message" && listener) this.listeners.delete(listener)
  }

  receive(message: ReadonlyArray<unknown>): void {
    if (!this.closed) this.dispatchEvent(new MessageEvent("message", { data: message }))
  }

  postMessage(message: ReadonlyArray<unknown>): void {
    const cloned = structuredClone(message)
    this.sent.push(cloned)
    queueMicrotask(() => this.deliver(cloned))
  }

  close(): void {
    this.closed = true
  }

  dispose(): void {
    this.close()
    for (const listener of this.listeners) this.removeEventListener("message", listener)
  }
}

type Mode = "object" | "raw" | "unprepared" | "withoutTransform" | "values" | "valuesUnprepared"

const execute = (fixture: Pick<Fixture, "name" | "sql" | "statements">, mode: Mode = "object", transform = false) =>
  Effect.gen(function*() {
    const name = `${fixture.name}-${mode}-${transform}`
    const database: Database = { ...fixture, releases: [] }
    const clientPort = new Transport()
    const workerPort = new Transport()
    clientPort.deliver = (message) => workerPort.receive(message)
    workerPort.deliver = (message) => clientPort.receive(message)
    databases.set(name, database)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        databases.delete(name)
        clientPort.dispose()
        workerPort.dispose()
      })
    )
    const listening = yield* Deferred.make<void>()
    clientPort.onListen = () => Deferred.doneUnsafe(listening, Exit.void)
    const scope = yield* Effect.acquireRelease(Scope.make(), (scope, exit) => Scope.close(scope, exit))
    const client = yield* SqliteClient.make({
      worker: Effect.succeed(clientPort as unknown as Worker),
      ...(transform ? { transformResultNames: (name: string) => `t_${name}` } : {})
    }).pipe(Scope.provide(scope), Effect.forkChild)
    // No sleep or listener-triggered fake ready: start the real worker loop
    // only after the client's public message-listener boundary is established.
    yield* Deferred.await(listening)
    const worker = yield* Effect.forkChild(OpfsWorker.run({ port: workerPort, dbName: name }))
    const sql = yield* Fiber.join(client)
    const statement = sql.unsafe(fixture.sql)
    const rows = yield* mode === "object" ? statement : statement[mode]
    yield* Scope.close(scope, Exit.void)
    yield* Fiber.join(worker)
    assert.deepStrictEqual(database.releases, ["db", "vfs"])
    assert.deepStrictEqual(clientPort.sent, [[0, fixture.sql, []], ["close"]])
    assert.strictEqual(workerPort.closed, true)
    assert.strictEqual(workerPort.sent.length, 2)
    assert.deepStrictEqual(workerPort.sent[0], ["ready", undefined, undefined])
    const reply = workerPort.sent[1]
    assert.strictEqual(reply[0], 0)
    assert.strictEqual(reply[1], undefined)
    return { rows, payload: reply[2] as Payload }
  }).pipe(Effect.provide(Reactivity.layer))

const many: Fixture = {
  name: "many rows with changing widths",
  sql:
    "SELECT 1 AS first, 11 AS extra UNION ALL SELECT 2, 22; SELECT 3 AS second UNION ALL SELECT 4; SELECT 5 AS third, NULL AS fourth UNION ALL SELECT 6, X'00ff'",
  statements: [
    { columns: ["first", "extra"], rows: [[1, 11], [2, 22]] },
    { columns: ["second"], rows: [[3], [4]] },
    { columns: ["third", "fourth"], rows: [[5, null], [6, new Uint8Array([0, 255])]] }
  ],
  objects: [
    { first: 1, extra: 11 },
    { first: 2, extra: 22 },
    { second: 3 },
    { second: 4 },
    { third: 5, fourth: null },
    { third: 6, fourth: new Uint8Array([0, 255]) }
  ],
  payload: [
    ["first", "extra"],
    [[1, 11], [2, 22], [3], [4], [5, null], [6, new Uint8Array([0, 255])]],
    [["first", "extra"], ["first", "extra"], ["second"], ["second"], ["third", "fourth"], ["third", "fourth"]]
  ]
}

const renamed: Fixture = {
  name: "renamed",
  sql: "SELECT 1 AS first; SELECT 2 AS second, 3 AS third",
  statements: [{ columns: ["first"], rows: [[1]] }, { columns: ["second", "third"], rows: [[2, 3]] }],
  objects: [{ first: 1 }, { second: 2, third: 3 }],
  payload: [["first"], [[1], [2, 3]], [["first"], ["second", "third"]]]
}

describe("Statement-specific columns (API seam)", () => {
  it.effect("uses each populated statement's names for every row, without phantom undefined keys", () =>
    Effect.gen(function*() {
      const result = yield* execute(many)
      assert.deepStrictEqual(result.rows, many.objects)
    }))

  it.effect("preserves legacy columns/flat rows and emits cloneable per-row metadata", () =>
    Effect.gen(function*() {
      const result = yield* execute(many, "values")
      assert.deepStrictEqual(result.rows, [[1, 11], [2, 22], [3], [4], [5, null], [6, new Uint8Array([0, 255])]])
      assert.deepStrictEqual(result.payload.slice(0, 2), many.payload.slice(0, 2))
      assert.deepStrictEqual(result.payload, many.payload)
      const metadata = result.payload[2]!
      assert.strictEqual(metadata[0], result.payload[0])
      assert.strictEqual(metadata[0], metadata[1])
      assert.strictEqual(metadata[2], metadata[3])
      assert.strictEqual(metadata[4], metadata[5])
      assert.notStrictEqual(metadata[0], metadata[2])
      assert.notStrictEqual(metadata[2], metadata[4])
      assert.deepStrictEqual(structuredClone(result.payload), many.payload)
    }))

  it.effect("preserves special own keys, NULL and BLOB in later statements", () =>
    Effect.gen(function*() {
      const result = yield* execute({
        name: "special keys",
        sql: "SELECT 1 AS first; SELECT NULL AS '__proto__', X'00ff' AS constructor, 'own' AS toString",
        statements: [
          { columns: ["first"], rows: [[1]] },
          { columns: ["__proto__", "constructor", "toString"], rows: [[null, new Uint8Array([0, 255]), "own"]] }
        ]
      })
      const expected = { ["__proto__"]: null, constructor: new Uint8Array([0, 255]), toString: "own" }
      assert.deepStrictEqual(result.rows, [{ first: 1 }, expected])
      const row = (result.rows as ReadonlyArray<object>)[1]
      assert.strictEqual(Object.getPrototypeOf(row), Object.prototype)
      assert.deepStrictEqual(Object.keys(row), ["__proto__", "constructor", "toString"])
      assert.deepStrictEqual(Object.getOwnPropertyDescriptor(row, "__proto__"), {
        value: null,
        writable: true,
        enumerable: true,
        configurable: true
      })
    }))

  it.effect.each<Fixture>([
    {
      name: "single populated statement with multiple rows",
      sql: "SELECT 1 AS value UNION ALL SELECT 2",
      statements: [{ columns: ["value"], rows: [[1], [2]] }],
      objects: [{ value: 1 }, { value: 2 }],
      payload: [["value"], [[1], [2]]]
    },
    {
      name: "identical columns from distinct populated statements",
      sql: "SELECT 1 AS value; SELECT 2 AS value",
      statements: [{ columns: ["value"], rows: [[1]] }, { columns: ["value"], rows: [[2]] }],
      objects: [{ value: 1 }, { value: 2 }],
      payload: [["value"], [[1], [2]], [["value"], ["value"]]]
    },
    {
      name: "empty first and last statements do not extend a single populated result",
      sql: "SELECT 0 AS ignored WHERE 0; SELECT 2 AS second, 3 AS third; SELECT 4 AS ignored WHERE 0",
      statements: [
        { columns: ["ignored"], rows: [] },
        { columns: ["second", "third"], rows: [[2, 3]] },
        { columns: ["ignored"], rows: [] }
      ],
      objects: [{ second: 2, third: 3 }],
      payload: [["second", "third"], [[2, 3]]]
    },
    {
      name: "DDL first",
      sql: "CREATE TABLE example (value INTEGER); SELECT 1 AS value",
      statements: [{ columns: [], rows: [] }, { columns: ["value"], rows: [[1]] }],
      objects: [{ value: 1 }],
      payload: [["value"], [[1]]]
    },
    {
      name: "single empty statement",
      sql: "SELECT 1 AS value WHERE 0",
      statements: [{ columns: ["value"], rows: [] }],
      objects: [],
      payload: [undefined, []]
    },
    {
      name: "all empty statements",
      sql: "SELECT 1 AS first WHERE 0; SELECT 2 AS second WHERE 0",
      statements: [{ columns: ["first"], rows: [] }, { columns: ["second"], rows: [] }],
      objects: [],
      payload: [undefined, []]
    },
    {
      name: "no statements",
      sql: "-- comment only",
      statements: [],
      objects: [],
      payload: [undefined, []]
    },
    {
      name: "empty middle statement does not contribute metadata",
      sql: "SELECT 1 AS first; SELECT 0 AS ignored WHERE 0; SELECT 2 AS second",
      statements: [
        { columns: ["first"], rows: [[1]] },
        { columns: ["ignored"], rows: [] },
        { columns: ["second"], rows: [[2]] }
      ],
      objects: [{ first: 1 }, { second: 2 }],
      payload: [["first"], [[1], [2]], [["first"], ["second"]]]
    }
  ])("handles $name", (fixture) =>
    Effect.gen(function*() {
      const result = yield* execute(fixture)
      assert.deepStrictEqual(result.rows, fixture.objects)
      assert.deepStrictEqual(result.payload, fixture.payload)
    }))

  it.effect.each<Mode>(["object", "raw", "unprepared", "withoutTransform", "values", "valuesUnprepared"])(
    "preserves the %s route with configured result-name transforms",
    (mode) =>
      Effect.gen(function*() {
        const result = yield* execute(renamed, mode, true)
        const expected = mode === "values" || mode === "valuesUnprepared"
          ? [[1], [2, 3]]
          : mode === "object" || mode === "unprepared"
          ? [{ t_first: 1 }, { t_second: 2, t_third: 3 }]
          : [{ first: 1 }, { second: 2, third: 3 }]
        assert.deepStrictEqual(result.rows, expected)
      })
  )

  it.effect.each<{ name: string; payload: Payload; objects: ReadonlyArray<unknown> }>([
    { name: "empty", payload: [undefined, []], objects: [] },
    {
      name: "NULL and BLOB",
      payload: [["value", "bytes"], [[null, new Uint8Array([0, 255])]]],
      objects: [{ value: null, bytes: new Uint8Array([0, 255]) }]
    },
    {
      name: "legacy lossy rows with own undefined fields",
      payload: [["first", "extra"], [[1, 2], [3]]],
      objects: [{ first: 1, extra: 2 }, { first: 3, extra: undefined }]
    }
  ])("accepts a custom worker's two-field reply: $name", ({ objects, payload }) =>
    Effect.gen(function*() {
      const worker = new Transport()
      worker.onListen = () => queueMicrotask(() => worker.receive(["ready", undefined, undefined]))
      worker.deliver = (message) => {
        if (typeof message[0] === "number") worker.receive([message[0], undefined, structuredClone(payload)])
      }
      yield* Effect.addFinalizer(() => Effect.sync(() => worker.dispose()))
      const scope = yield* Effect.acquireRelease(Scope.make(), (scope, exit) => Scope.close(scope, exit))
      const sql = yield* SqliteClient.make({ worker: Effect.succeed(worker as unknown as Worker) }).pipe(
        Scope.provide(scope)
      )
      const rows = yield* sql`SELECT 1`
      const values = yield* sql`SELECT 1`.values
      const unprepared = yield* sql`SELECT 1`.valuesUnprepared
      yield* Scope.close(scope, Exit.void)
      assert.deepStrictEqual(rows, objects)
      assert.deepStrictEqual(values, payload[1])
      assert.deepStrictEqual(unprepared, payload[1])
      assert.deepStrictEqual(worker.sent.at(-1), ["close"])
    }).pipe(Effect.provide(Reactivity.layer)))
})
