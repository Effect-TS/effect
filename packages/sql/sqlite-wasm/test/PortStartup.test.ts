import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Option, Scope } from "effect"
import { TestClock } from "effect/testing"
import { Reactivity } from "effect/unstable/reactivity"
import { vi } from "vitest"

// API-seam tests, not native SQL: model MessagePort's initially disabled incoming
// queue and wa-sqlite's synchronous statement cursor. State belongs to each
// factory/database, so concurrently registered cases do not share a cursor.
const databases = vi.hoisted(() => new Map<string, Array<string>>())

vi.mock("@effect/wa-sqlite/dist/wa-sqlite.mjs", () => ({
  default: async () => ({ releases: [] })
}))
vi.mock("@effect/wa-sqlite/src/examples/AccessHandlePoolVFS.js", () => ({
  AccessHandlePoolVFS: {
    create: async (_name: string, module: { releases: Array<string> }) => ({
      close: async () => {
        module.releases.push("vfs")
      }
    })
  }
}))
vi.mock("@effect/wa-sqlite", () => ({
  SQLITE_ROW: 100,
  Factory: (module: { releases: Array<string> }) => ({
    open_v2(name: string) {
      databases.set(name, module.releases)
      return 1
    },
    close() {
      module.releases.push("db")
    },
    vfs_register() {},
    *statements(_db: number, sql: string) {
      if (sql !== "SELECT 42 AS answer") throw new Error(`Unexpected SQL: ${sql}`)
      yield { stepped: false }
    },
    bind_collection() {},
    step(stmt: { stepped: boolean }) {
      if (stmt.stepped) return 101
      stmt.stepped = true
      return 100
    },
    column_names: () => ["answer"],
    row: () => [42]
  })
}))

import { OpfsWorker, SqliteClient } from "@effect/sql-sqlite-wasm"

class Endpoint extends EventTarget {
  peer!: Endpoint
  readonly incoming: Array<ReadonlyArray<unknown>> = []
  readonly sent: Array<ReadonlyArray<unknown>> = []
  readonly listeners = new Set<EventListenerOrEventListenerObject>()
  readonly starts: Array<number> = []
  readonly events: Array<string> = []
  closes = 0
  onPost: (message: ReadonlyArray<unknown>) => void = () => {}
  onListen: () => void = () => {}

  constructor(private active: boolean) {
    super()
  }

  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    super.addEventListener(type, listener)
    if (type === "message" && listener) {
      this.listeners.add(listener)
      this.events.push("listen")
      this.onListen()
    }
    // addEventListener must NOT enable or flush an unstarted queue.
  }

  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    super.removeEventListener(type, listener)
    if (type === "message" && listener) this.listeners.delete(listener)
  }

  postMessage(message: ReadonlyArray<unknown>): void {
    this.sent.push(structuredClone(message))
    this.peer.incoming.push(structuredClone(message))
    this.peer.drain()
    this.onPost(message)
  }

  enable(): void {
    this.active = true
    this.drain()
  }

  private drain(): void {
    queueMicrotask(() => {
      while (this.active && this.closes === 0 && this.incoming.length > 0) {
        const data = this.incoming.shift()!
        this.events.push(`receive:${data[0]}`)
        this.dispatchEvent(new MessageEvent("message", { data }))
      }
    })
  }

  close(): void {
    this.closes++
    this.incoming.length = 0
  }

  dispose(): void {
    this.close()
    // Own the fixture's listeners, including the existing SharedWorker wrapper
    // cleanup limitation. This test does not claim to fix listener ownership.
    for (const listener of this.listeners) this.removeEventListener("message", listener)
  }
}

class StartableEndpoint extends Endpoint {
  start(): void {
    this.starts.push(this.listeners.size)
    this.events.push("start")
    this.enable()
  }
}

type Mode = "fresh" | "started" | "absent" | "non-callable"

const endpoint = (mode: Mode): Endpoint => {
  if (mode === "absent") return new Endpoint(true)
  if (mode === "non-callable") return Object.assign(new Endpoint(true), { start: 1 })
  const port = new StartableEndpoint(false)
  if (mode === "started") port.start() // Explicit control, never a fixture default.
  return port
}

const observe = <A>(done: Deferred.Deferred<A>) =>
  Effect.gen(function*() {
    const waiter = yield* Deferred.await(done).pipe(Effect.timeoutOption("100 millis"), Effect.forkChild)
    yield* TestClock.adjust("100 millis")
    return yield* Fiber.join(waiter)
  })

describe("MessagePort startup (API seam)", () => {
  it.effect.each(
    [
      { name: "fresh direct client", client: "fresh", server: "started", shared: false },
      { name: "fresh extracted SharedWorker-like port", client: "fresh", server: "started", shared: true },
      { name: "fresh worker port", client: "started", server: "fresh", shared: false },
      { name: "both fresh ports", client: "fresh", server: "fresh", shared: false },
      { name: "already-started ports", client: "started", server: "started", shared: false },
      {
        name: "dedicated Worker-like client and global-self-like server",
        client: "absent",
        server: "absent",
        shared: false
      },
      { name: "structural port without start", client: "started", server: "absent", shared: false },
      { name: "non-callable start members", client: "non-callable", server: "non-callable", shared: false }
    ] as const
  )("completes query and scoped close: $name", ({ client, name, server, shared }) =>
    Effect.gen(function*() {
      const clientPort = endpoint(client)
      const serverPort = endpoint(server)
      clientPort.peer = serverPort
      serverPort.peer = clientPort
      const readyPosted = yield* Deferred.make<void>()
      const listening = yield* Deferred.make<void>()
      const completed = yield* Deferred.make<ReadonlyArray<unknown>>()
      clientPort.onListen = () => Deferred.doneUnsafe(listening, Exit.void)
      serverPort.onPost = (message) => {
        if (message[0] === "ready") Deferred.doneUnsafe(readyPosted, Exit.void)
      }
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          clientPort.dispose()
          serverPort.dispose()
          databases.delete(name)
        })
      )
      const worker = yield* Effect.forkChild(OpfsWorker.run({ port: serverPort, dbName: name }))
      const clientScope = yield* Effect.acquireRelease(Scope.make(), (scope, exit) => Scope.close(scope, exit))
      const transport = shared ? Object.assign(new EventTarget(), { port: clientPort }) : clientPort
      const request = yield* Effect.gen(function*() {
        const sql = yield* SqliteClient.make({ worker: Effect.succeed(transport as unknown as Worker) })
        const rows = yield* sql`SELECT 42 AS answer`
        yield* Deferred.succeed(completed, rows)
      }).pipe(Scope.provide(clientScope), Effect.forkChild)

      // Healthy public boundaries: the client has installed its listener and
      // the worker has posted ready. Only then bound observable query progress.
      yield* Deferred.await(listening)
      yield* Deferred.await(readyPosted)
      const observed = yield* observe(completed)
      const clientStarts = [...clientPort.starts]
      const serverStarts = [...serverPort.starts]

      // Counterfactual recovery AFTER observation lets BASE fail an assertion,
      // not leak an uninterruptible constructor or a buffered close request.
      clientPort.enable()
      serverPort.enable()
      yield* Fiber.join(request)
      yield* Scope.close(clientScope, Exit.void)
      yield* Fiber.join(worker)

      assert.deepStrictEqual(clientPort.sent, [[0, "SELECT 42 AS answer", []], ["close"]])
      assert.deepStrictEqual(serverPort.sent, [["ready", undefined, undefined], [0, undefined, [["answer"], [[42]]]]])
      assert.strictEqual(serverPort.closes, 1)
      assert.deepStrictEqual(databases.get(name), ["db", "vfs"])
      assert(Option.isSome(observed), "ready/query remained buffered until explicit recovery activation")
      assert.deepStrictEqual(observed.value, [{ answer: 42 }])
      for (const [mode, starts] of [[client, clientStarts], [server, serverStarts]] as const) {
        if (mode === "started") {
          // Pre-started controls must also complete on the old implementation.
          // Any repeated library activation must follow listener registration.
          assert.strictEqual(starts[0], 0)
          assert(starts.slice(1).every((listeners) => listeners === 1))
        } else {
          assert.deepStrictEqual(starts, mode === "fresh" ? [1] : [])
        }
      }
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("starts the worker after listening and before consuming a previously queued query", () =>
    Effect.gen(function*() {
      const server = new StartableEndpoint(false)
      const peer = new Endpoint(true)
      server.peer = peer
      peer.peer = server
      const ready = yield* Deferred.make<void>()
      const reply = yield* Deferred.make<ReadonlyArray<unknown>>()
      server.onPost = (message) => {
        if (message[0] === "ready") Deferred.doneUnsafe(ready, Exit.void)
        if (message[0] === 7) Deferred.doneUnsafe(reply, Exit.succeed(message))
      }
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          server.dispose()
          peer.dispose()
          databases.delete("queued-query")
        })
      )
      peer.postMessage([7, "SELECT 42 AS answer", []])
      const worker = yield* Effect.forkChild(OpfsWorker.run({ port: server, dbName: "queued-query" }))
      yield* Deferred.await(ready)
      const observed = yield* observe(reply)
      const events = [...server.events]
      server.enable() // Recovery only after the observation, as above.
      yield* Deferred.await(reply)
      peer.postMessage(["close"])
      yield* Fiber.join(worker)

      assert.deepStrictEqual(databases.get("queued-query"), ["db", "vfs"])
      assert(Option.isSome(observed), "the queued worker request was not consumed")
      assert.deepStrictEqual(observed.value, [7, undefined, [["answer"], [[42]]]])
      assert.deepStrictEqual(events, ["listen", "start", "receive:7"])
    }))
})
