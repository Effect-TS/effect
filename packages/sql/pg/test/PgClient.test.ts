import { PgClient } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Queue, Scope } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Pg from "pg"
import { vi } from "vitest"

type Listener =
  | ((notification: Pg.Notification) => void)
  | ((error: Error) => void)
  | (() => void)

class FakeListenClient {
  readonly queries: Array<string> = []
  readonly listeners = new Map<string, Set<Listener>>()

  constructor(
    readonly queryImpl: (text: string, client: FakeListenClient) => Promise<unknown> = () => Promise.resolve()
  ) {}

  on(event: string, listener: Listener): this {
    const listeners = this.listeners.get(event) ?? new Set()
    listeners.add(listener)
    this.listeners.set(event, listeners)
    return this
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener)
    return this
  }

  query(text: string): Promise<unknown> {
    this.queries.push(text)
    return this.queryImpl(text, this)
  }

  emit(event: string, value?: Pg.Notification | Error): void {
    for (const listener of this.listeners.get(event) ?? []) {
      ;(listener as (value?: Pg.Notification | Error) => void)(value)
    }
  }
}

const makeClient = (client: FakeListenClient) =>
  PgClient.makeWith({
    acquirer: Effect.die("unused"),
    transactionAcquirer: Effect.die("unused"),
    listenAcquirer: Effect.succeed(client as unknown as Pg.ClientBase),
    config: {}
  }).pipe(Effect.provide(Reactivity.layer))

const makePool = () =>
  ({
    options: {},
    ending: false,
    connect: () => undefined,
    query: () => Promise.resolve({ rows: [] })
  }) as unknown as Pg.Pool

it.effect("listen is ready when it returns and preserves empty payloads", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient((text, client) => {
      if (text.startsWith("LISTEN")) {
        client.emit("notification", {
          channel: "events",
          payload: "",
          processId: 1
        })
      }
      return Promise.resolve()
    })
    const sql = yield* makeClient(client)

    const notifications = yield* sql.listen("events")
    const payload = yield* Queue.take(notifications)

    assert.strictEqual(payload, "")
    assert.deepStrictEqual(client.queries, [`LISTEN "events"`])
  }))

it.effect("listen surfaces setup failures", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient(() => Promise.reject(new Error("listen failed")))
    const sql = yield* makeClient(client)

    const error = yield* sql.listen("events").pipe(Effect.flip)

    assert.strictEqual(error.reason._tag, "UnknownError")
    assert.deepStrictEqual(client.queries, [`LISTEN "events"`, `UNLISTEN "events"`])
    assert.isTrue(Array.from(client.listeners.values()).every((listeners) => listeners.size === 0))
  }))

it.effect("listen fails setup when the connection ends before acknowledgement", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient((text, client) => {
      if (text.startsWith("LISTEN")) {
        client.emit("end")
      }
      return Promise.resolve()
    })
    const sql = yield* makeClient(client)

    const error = yield* sql.listen("events").pipe(Effect.flip)

    assert.strictEqual(error.reason._tag, "ConnectionError")
    assert.strictEqual(error.reason.message, "Postgres listener connection ended")
    assert.isTrue(Array.from(client.listeners.values()).every((listeners) => listeners.size === 0))
  }))

it.effect("listen surfaces connection errors through the dequeue", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient()
    const sql = yield* makeClient(client)
    const notifications = yield* sql.listen("events")

    client.emit("error", new Error("connection lost"))
    const error = yield* Queue.take(notifications).pipe(Effect.flip)

    assert.strictEqual(error.reason._tag, "ConnectionError")
    assert.strictEqual(error.reason.message, "Postgres listener connection failed")
  }))

it.effect("listen surfaces connection end through the dequeue", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient()
    const sql = yield* makeClient(client)
    const notifications = yield* sql.listen("events")

    client.emit("end")
    const error = yield* Queue.take(notifications).pipe(Effect.flip)

    assert.strictEqual(error.reason._tag, "ConnectionError")
    assert.strictEqual(error.reason.message, "Postgres listener connection ended")
  }))

it.effect("listen fails late subscriptions after the shared connection ends", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient()
    const sql = yield* makeClient(client)
    const firstScope = yield* Scope.make()
    const first = yield* sql.listen("events").pipe(Scope.provide(firstScope))
    client.emit("end")

    const firstError = yield* Queue.take(first).pipe(Effect.flip)
    const secondError = yield* sql.listen("events").pipe(Effect.flip)

    assert.strictEqual(firstError.reason._tag, "ConnectionError")
    assert.strictEqual(secondError, firstError)
    assert.deepStrictEqual(client.queries, [`LISTEN "events"`])
    yield* Scope.close(firstScope, Exit.void)
  }))

it.effect("listen retries setup after a failed attempt", () =>
  Effect.gen(function*() {
    let attempts = 0
    const client = new FakeListenClient((text) => {
      if (text.startsWith("LISTEN") && attempts++ === 0) {
        return Promise.reject(new Error("listen failed"))
      }
      return Promise.resolve()
    })
    const sql = yield* makeClient(client)

    yield* sql.listen("events").pipe(Effect.flip)
    yield* sql.listen("events")

    assert.deepStrictEqual(client.queries, [
      `LISTEN "events"`,
      `UNLISTEN "events"`,
      `LISTEN "events"`
    ])
  }))

it.effect("listen releases the subscription with its scope", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient()
    const sql = yield* makeClient(client)
    const scope = yield* Scope.make()
    const notifications = yield* sql.listen("events").pipe(Scope.provide(scope))

    yield* Scope.close(scope, Exit.void)

    assert.deepStrictEqual(client.queries, [`LISTEN "events"`, `UNLISTEN "events"`])
    assert.isTrue(Array.from(client.listeners.values()).every((listeners) => listeners.size === 0))
    assert.isTrue(Exit.hasInterrupts(yield* Queue.take(notifications).pipe(Effect.exit)))
  }))

it.effect("listen reference counts subscriptions on the same connection and channel", () =>
  Effect.gen(function*() {
    const client = new FakeListenClient()
    const sql = yield* makeClient(client)
    const firstScope = yield* Scope.make()
    const secondScope = yield* Scope.make()
    yield* sql.listen("events").pipe(Scope.provide(firstScope))
    const second = yield* sql.listen("events").pipe(Scope.provide(secondScope))

    assert.deepStrictEqual(client.queries, [`LISTEN "events"`])
    assert.isTrue(Array.from(client.listeners.values()).every((listeners) => listeners.size === 1))

    yield* Scope.close(firstScope, Exit.void)
    client.emit("notification", {
      channel: "events",
      payload: "hello",
      processId: 1
    })

    assert.strictEqual(yield* Queue.take(second), "hello")
    assert.deepStrictEqual(client.queries, [`LISTEN "events"`])

    yield* Scope.close(secondScope, Exit.void)

    assert.deepStrictEqual(client.queries, [`LISTEN "events"`, `UNLISTEN "events"`])
  }))

it.effect("fromPool closes a listener client when connect fails", () =>
  Effect.gen(function*() {
    const connect = vi.spyOn(Pg.Client.prototype, "connect").mockRejectedValue(new Error("connect failed"))
    const end = vi.spyOn(Pg.Client.prototype, "end").mockResolvedValue(undefined)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        connect.mockRestore()
        end.mockRestore()
      })
    )
    const sql = yield* PgClient.fromPool({ acquire: Effect.succeed(makePool()) }).pipe(
      Effect.provide(Reactivity.layer)
    )

    const error = yield* sql.listen("events").pipe(Effect.flip)

    assert.strictEqual(error.reason._tag, "UnknownError")
    assert.strictEqual(end.mock.calls.length, 1)
  }))

it.effect("fromPool closes a listener client when connect is interrupted", () =>
  Effect.gen(function*() {
    const started = yield* Deferred.make<void>()
    const connect = vi.spyOn(Pg.Client.prototype, "connect").mockImplementation(() => {
      Deferred.doneUnsafe(started, Effect.void)
      return new Promise<void>(() => {})
    })
    const end = vi.spyOn(Pg.Client.prototype, "end").mockResolvedValue(undefined)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        connect.mockRestore()
        end.mockRestore()
      })
    )
    const sql = yield* PgClient.fromPool({ acquire: Effect.succeed(makePool()) }).pipe(
      Effect.provide(Reactivity.layer)
    )
    const fiber = yield* sql.listen("events").pipe(Effect.forkChild)
    yield* Deferred.await(started)

    yield* Fiber.interrupt(fiber)

    assert.strictEqual(end.mock.calls.length, 1)
  }))
