import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { EventEmitter } from "node:events"
import { vi } from "vitest"

const state = {
  connections: [] as Array<MockConnection>,
  pendingStarted: Deferred.makeUnsafe<void>(),
  errorAfterConnect: false,
  emissionError: undefined as unknown
}

class MockRequest extends EventEmitter {
  constructor(
    readonly sql: string,
    readonly callback: (cause: unknown, rowCount: number, rows: ReadonlyArray<any>) => void
  ) {
    super()
  }

  addParameter() {}
}

class MockConnection extends EventEmitter {
  closed = false
  readonly closedSignal = Deferred.makeUnsafe<void>()
  pending: MockRequest | undefined
  cancellations = 0
  readonly queries: Array<string> = []

  constructor() {
    super()
    state.connections.push(this)
  }

  connect(callback: (cause: unknown) => void) {
    // Resume acquisition, then emit in the same driver turn, before a forked
    // pool listener can run. Do not install a test-only error listener.
    queueMicrotask(() => {
      callback(null)
      if (state.errorAfterConnect) {
        state.errorAfterConnect = false
        this.closed = true
        try {
          this.emit("error", new Error("Connection lost - read ETIMEDOUT"))
        } catch (error) {
          state.emissionError = error
        }
      }
    })
  }

  close() {
    if (!this.closed) {
      this.closed = true
      this.emit("end")
    }
    Effect.runSync(Deferred.succeed(this.closedSignal, undefined))
  }

  cancel() {
    // MssqlClient also calls cancel before each request. Count only an actual
    // in-flight cancellation, so that cannot satisfy the interruption assertion.
    if (this.pending) {
      this.cancellations++
      this.pending = undefined
    }
  }

  execSql(request: MockRequest) {
    this.queries.push(request.sql)
    if (this.closed) {
      request.callback(new Error("Requests can only be made in the LoggedIn state, not the Final state"), 0, [])
    } else if (request.sql === "SELECT pending") {
      this.pending = request
      Effect.runSync(Deferred.succeed(state.pendingStarted, undefined))
    } else {
      request.callback(null, 1, [[{ metadata: { colName: "value" }, value: 42 }]])
    }
  }
}

vi.mock("tedious", () => ({
  Connection: MockConnection,
  Request: MockRequest,
  TYPES: { NVarChar: {}, Float: {}, BigInt: {}, Bit: {}, DateTime: {}, VarBinary: {} }
}))

const reset = () => {
  state.connections = []
  state.pendingStarted = Deferred.makeUnsafe<void>()
  state.errorAfterConnect = false
  state.emissionError = undefined
}

const makeClient = Effect.gen(function*() {
  const { MssqlClient } = yield* Effect.promise(() => import("@effect/sql-mssql"))
  return yield* MssqlClient.make({
    server: "localhost",
    minConnections: 0,
    maxConnections: 1,
    connectionTTL: "1 hour"
  })
})

const bounded = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(Effect.timeout("2 seconds"))

describe("MssqlClient connection lifecycle", { concurrent: false }, () => {
  it.live("replaces a connection that ends without error after query cancellation", () =>
    Effect.gen(function*() {
      reset()
      const client = yield* bounded(makeClient)
      const connection = state.connections[0]
      const query = yield* Effect.forkScoped(client.unsafe("SELECT pending"))
      yield* bounded(Deferred.await(state.pendingStarted))
      yield* bounded(Fiber.interrupt(query))
      assert.strictEqual(connection.cancellations, 1)

      // Model tedious' cancel timeout: Final state and end, with no error event.
      connection.close()
      yield* Effect.yieldNow
      const rows = yield* bounded(client.unsafe("SELECT recovered"))
      assert.deepStrictEqual(rows, [{ value: 42 }])
      assert.strictEqual(state.connections.length, 2)
      assert.isFalse(connection.queries.includes("SELECT recovered"))
      assert.isTrue(state.connections[1].queries.includes("SELECT recovered"))
    }).pipe(Effect.scoped, Effect.provide(Reactivity.layer)))

  it.live("handles an error immediately after the connect callback and does not reuse the failed connection", () =>
    Effect.gen(function*() {
      reset()
      const client = yield* bounded(makeClient)
      const original = state.connections[0]
      yield* Effect.yieldNow

      // Retire the healthy connection through a normal driver error, then
      // inject the callback race on the next acquisition of this same pool.
      state.errorAfterConnect = true
      original.emit("error", new Error("Connection lost"))
      yield* bounded(Deferred.await(original.closedSignal))
      yield* bounded(Effect.result(client.unsafe("SELECT during_race")))
      assert.isUndefined(state.emissionError, "the driver's error emission must not throw")

      const failed = state.connections[1]
      assert.isTrue(failed.closed)
      const rows = yield* bounded(client.unsafe("SELECT recovered"))
      assert.deepStrictEqual(rows, [{ value: 42 }])
      assert.isFalse(failed.queries.includes("SELECT recovered"))
      assert.isTrue(state.connections.slice(2).some((connection) => connection.queries.includes("SELECT recovered")))
    }).pipe(Effect.scoped, Effect.provide(Reactivity.layer)))
})
