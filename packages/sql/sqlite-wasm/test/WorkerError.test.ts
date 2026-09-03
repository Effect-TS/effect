import { OpfsWorker, SqliteClient } from "@effect/sql-sqlite-wasm"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { vi } from "vitest"

// API-seam coverage: these mocks do not execute WASM or OPFS. Each Factory owns
// its state. Error shapes match wa-sqlite's native code 19 and code 8 errors.
vi.mock("@effect/wa-sqlite/dist/wa-sqlite.mjs", () => ({ default: async () => ({}) }))
vi.mock("@effect/wa-sqlite/src/examples/AccessHandlePoolVFS.js", () => ({
  AccessHandlePoolVFS: { create: async () => ({ close: async () => {} }) }
}))
vi.mock("@effect/wa-sqlite", () => ({
  SQLITE_ROW: 100,
  Factory: () => {
    const items = new Map<unknown, ReadonlyArray<unknown>>()
    let readonly = false
    return {
      close() {},
      open_v2: () => 1,
      vfs_register() {},
      *statements(_db: number, sql: string) {
        yield { sql, params: [], rows: undefined, index: -1 }
      },
      bind_collection(stmt: TestStatement, params: ReadonlyArray<unknown>) {
        stmt.params = params
      },
      step(stmt: TestStatement) {
        if (stmt.rows === undefined) {
          stmt.rows = []
          if (stmt.sql.startsWith("INSERT INTO items")) {
            if (readonly) throw Object.assign(new Error("attempt to write a readonly database"), { code: 8 })
            if (items.has(stmt.params[0])) {
              throw Object.assign(new Error("UNIQUE constraint failed: items.id"), { code: 19 })
            }
            if (stmt.params[1] === "") {
              throw Object.assign(new Error("CHECK constraint failed: length(label) > 0"), { code: 19 })
            }
            items.set(stmt.params[0], stmt.params)
          } else if (stmt.sql === "PRAGMA query_only = ON") {
            readonly = true
          } else if (stmt.sql === "PRAGMA query_only = OFF") {
            readonly = false
          } else if (stmt.sql === "SELECT regular_error") {
            throw new Error("regular failure")
          } else if (stmt.sql === "SELECT string_code_error") {
            throw Object.assign(new Error("string code failure"), { code: "19" })
          } else if (stmt.sql === "SELECT message_less_error") {
            throw { toString: () => "message-less failure" }
          } else if (stmt.sql.startsWith("SELECT")) {
            stmt.rows = Array.from(items.values())
          } else if (!stmt.sql.startsWith("CREATE TABLE")) {
            throw new Error(`Unexpected fixture statement: ${stmt.sql}`)
          }
        }
        return ++stmt.index < stmt.rows.length ? 100 : 101
      },
      column_names: () => ["id", "label", "payload"],
      row: (stmt: TestStatement) => stmt.rows![stmt.index]
    }
  }
}))

interface TestStatement {
  sql: string
  params: ReadonlyArray<unknown>
  rows: Array<ReadonlyArray<unknown>> | undefined
  index: number
}

class TestPort extends EventTarget {
  readonly listening = Deferred.makeUnsafe<void>()
  readonly messages: Array<ReadonlyArray<unknown>> = []
  peer: TestPort = this

  close() {}

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener, options)
    if (type === "message") Deferred.doneUnsafe(this.listening, Exit.void)
  }

  postMessage(message: ReadonlyArray<unknown>): void {
    const cloned = structuredClone(message)
    this.messages.push(cloned)
    queueMicrotask(() => this.peer.dispatchEvent(new MessageEvent("message", { data: cloned })))
  }
}

const makeClient = () =>
  Effect.gen(function*() {
    const client = new TestPort()
    const server = new TestPort()
    client.peer = server
    server.peer = client
    // The worker may send ready only after the client installs its listener.
    const worker = yield* Deferred.await(client.listening).pipe(
      Effect.andThen(OpfsWorker.run({ port: server, dbName: "test.db" })),
      Effect.forkScoped
    )
    // Registered before the client: wait for its normal close message at teardown.
    yield* Effect.addFinalizer(() => Fiber.join(worker).pipe(Effect.orDie))
    const sql = yield* SqliteClient.make({ worker: Effect.succeed(client as unknown as Worker) })
    return { sql, requests: client.messages, replies: server.messages }
  })

const setup = (sql: SqliteClient.SqliteClient) =>
  Effect.gen(function*() {
    yield* sql`CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT CHECK (length(label) > 0), payload BLOB)`
    yield* sql`INSERT INTO items (id, label, payload) VALUES (${1}, ${"first"}, ${new Uint8Array([0, 255, 17])})`
  })

const assertReply = (
  requests: ReadonlyArray<ReadonlyArray<unknown>>,
  replies: ReadonlyArray<ReadonlyArray<unknown>>,
  error: unknown
) => {
  const request = requests[requests.length - 1]
  const reply = replies[replies.length - 1]
  assert.strictEqual(typeof request[0], "number")
  assert.deepStrictEqual(reply, [request[0], error, undefined])
}

describe("worker error metadata", () => {
  it.effect("classifies duplicate primary keys through the public client", () =>
    Effect.gen(function*() {
      const { replies, requests, sql } = yield* makeClient()
      yield* setup(sql)
      const error = yield* sql`INSERT INTO items (id, label, payload) VALUES (${1}, ${"duplicate"}, ${null})`.pipe(
        Effect.flip
      )
      assert.strictEqual(error.reason._tag, "ConstraintError")
      const cause = { message: "UNIQUE constraint failed: items.id", code: 19 }
      assert.deepStrictEqual(error.reason.cause, cause)
      assertReply(requests, replies, cause)

      yield* sql`INSERT INTO items (id, label, payload) VALUES (${2}, ${"second"}, ${null})`
      assert.deepStrictEqual(yield* sql`SELECT id, label, payload FROM items ORDER BY id`, [
        { id: 1, label: "first", payload: new Uint8Array([0, 255, 17]) },
        { id: 2, label: "second", payload: null }
      ])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("preserves code 19 for CHECK constraint failures", () =>
    Effect.gen(function*() {
      const { replies, requests, sql } = yield* makeClient()
      yield* setup(sql)
      const error = yield* sql`INSERT INTO items (id, label, payload) VALUES (${2}, ${""}, ${null})`.pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "ConstraintError")
      const cause = { message: "CHECK constraint failed: length(label) > 0", code: 19 }
      assert.deepStrictEqual(error.reason.cause, cause)
      assertReply(requests, replies, cause)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("preserves code 8 without changing its UnknownError classification", () =>
    Effect.gen(function*() {
      const { replies, requests, sql } = yield* makeClient()
      yield* setup(sql)
      yield* sql`PRAGMA query_only = ON`
      const error = yield* sql`INSERT INTO items (id, label, payload) VALUES (${2}, ${"second"}, ${null})`.pipe(
        Effect.flip
      )
      assert.strictEqual(error.reason._tag, "UnknownError")
      const cause = { message: "attempt to write a readonly database", code: 8 }
      assert.deepStrictEqual(error.reason.cause, cause)
      assertReply(requests, replies, cause)
      yield* sql`PRAGMA query_only = OFF`
      assert.deepStrictEqual(yield* sql`SELECT id, label, payload FROM items ORDER BY id`, [
        { id: 1, label: "first", payload: new Uint8Array([0, 255, 17]) }
      ])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.each([
    { query: "SELECT regular_error", message: "regular failure" },
    { query: "SELECT string_code_error", message: "string code failure" },
    { query: "SELECT message_less_error", message: "message-less failure" }
  ])("keeps the message fallback for $query", ({ message, query }) =>
    Effect.gen(function*() {
      const { replies, requests, sql } = yield* makeClient()
      const error = yield* sql.unsafe(query).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "UnknownError")
      assert.strictEqual(error.reason.cause, message)
      assertReply(requests, replies, message)
      assert.deepStrictEqual(yield* sql`SELECT id, label, payload FROM items ORDER BY id`, [])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("accepts legacy string errors and subsequent empty-error success replies", () =>
    Effect.gen(function*() {
      const worker = new class extends EventTarget {
        override addEventListener(
          type: string,
          listener: EventListenerOrEventListenerObject | null,
          options?: boolean | AddEventListenerOptions
        ): void {
          super.addEventListener(type, listener, options)
          if (type === "message") {
            queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: ["ready"] })))
          }
        }
        postMessage(message: ReadonlyArray<unknown>): void {
          if (typeof message[0] !== "number") return
          const reply = message[1] === "SELECT legacy_error"
            ? [message[0], "legacy custom peer failure", undefined]
            : [message[0], "", [["value"], [[1]]]]
          queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: structuredClone(reply) })))
        }
      }()
      const sql = yield* SqliteClient.make({ worker: Effect.succeed(worker as unknown as Worker) })
      const error = yield* sql`SELECT legacy_error`.pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "UnknownError")
      assert.strictEqual(error.reason.cause, "legacy custom peer failure")
      assert.deepStrictEqual(yield* sql`SELECT 1 AS value`, [{ value: 1 }])
    }).pipe(Effect.provide(Reactivity.layer)))
})
