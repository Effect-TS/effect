import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Latch from "effect/Latch"
import * as Scheduler from "effect/Scheduler"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Socket from "effect/unstable/socket/Socket"

type EventType = "open" | "message" | "error" | "close"

class TestWebSocket implements Socket.WebSocketLike {
  readonly listeners = new Map<
    EventType,
    Set<{ readonly listener: (event: Socket.WebSocketEvent) => void; readonly once: boolean }>
  >()
  readyState = 0
  pauseCount = 0
  resumeCount = 0

  constructor(readonly openListenerAttached: Latch.Latch) {}

  pause(): void {
    this.pauseCount++
  }

  resume(): void {
    this.resumeCount++
  }

  addEventListener(
    type: EventType,
    listener: (event: Socket.WebSocketEvent) => void,
    options?: { readonly once?: boolean }
  ): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add({ listener, once: options?.once === true })
    this.listeners.set(type, listeners)
    if (type === "open") this.openListenerAttached.openUnsafe()
  }

  removeEventListener(type: EventType, listener: (event: Socket.WebSocketEvent) => void): void {
    const listeners = this.listeners.get(type)
    if (listeners === undefined) return
    for (const entry of listeners) {
      if (entry.listener === listener) listeners.delete(entry)
    }
  }

  dispatch(type: EventType, event: Socket.WebSocketEvent): void {
    const listeners = this.listeners.get(type)
    if (listeners === undefined) return
    for (const entry of Array.from(listeners)) {
      if (entry.once) listeners.delete(entry)
      entry.listener(event)
    }
  }

  listenerCount(type: EventType): number {
    return this.listeners.get(type)?.size ?? 0
  }

  close(): void {}
  send(): void {}
}

const stubSocket = (pull: Socket.Reader["pull"]) => {
  let upgraded = false
  const socket = Socket.make({
    reader: Effect.succeed({
      pull,
      upgrade: () =>
        Effect.sync(() => {
          upgraded = true
        })
    }),
    writer: Effect.succeed({
      write: () => Effect.void,
      writeAll: () => Effect.void
    })
  })
  return { socket, wasUpgraded: () => upgraded }
}

const manualScheduler = () => {
  const tasks: Array<() => void> = []
  const dispatcher = {
    scheduleTask(task: () => void) {
      tasks.push(task)
    },
    flush() {
      while (tasks.length > 0) tasks.shift()!()
    }
  }
  const scheduler: Scheduler.Scheduler = {
    executionMode: "sync",
    shouldYield: () => false,
    makeDispatcher: () => dispatcher
  }
  return { tasks, scheduler, flush: dispatcher.flush }
}

describe("Socket", () => {
  describe("make", () => {
    it.effect("exposes TLS upgrade on the acquired reader", () =>
      Effect.gen(function*() {
        const { socket, wasUpgraded } = stubSocket(Effect.never)

        const { upgrade } = yield* socket.reader
        yield* upgrade()

        assert.isTrue(wasUpgraded())
      }))

    it.effect("readerBytes maps pulls to bytes", () =>
      Effect.gen(function*() {
        const { socket } = stubSocket(Effect.succeed(["hello"]))

        const pull = yield* Socket.readerBytes(socket)
        const [message] = yield* pull

        assert.deepStrictEqual(message, new TextEncoder().encode("hello"))
      }))

    it.effect("readerString maps pulls to strings", () =>
      Effect.gen(function*() {
        const { socket } = stubSocket(Effect.succeed([new TextEncoder().encode("hello")]))

        const pull = yield* Socket.readerString(socket)
        const [message] = yield* pull

        assert.strictEqual(message, "hello")
      }))
  })

  describe("fromWebSocket", () => {
    it.effect("removes the open listener when the socket closes while connecting", () =>
      Effect.gen(function*() {
        const openListenerAttached = Latch.makeUnsafe(false)
        const ws = new TestWebSocket(openListenerAttached)
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const reader = yield* socket.reader.pipe(
          Effect.exit,
          Effect.forkChild({ startImmediately: true })
        )

        yield* openListenerAttached.await
        ws.dispatch("close", { code: 1006, reason: "closed while connecting" })

        assert.isTrue(Exit.isFailure(yield* Fiber.join(reader)))
        assert.strictEqual(ws.listenerCount("open"), 0)
      }))

    it.effect("delivers to a waiting consumer immediately without pausing or scheduling delivery", () =>
      Effect.gen(function*() {
        const { scheduler, tasks } = manualScheduler()
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: 1 })
        const { pull } = yield* socket.reader.pipe(
          Effect.provideService(Scheduler.Scheduler, scheduler)
        )
        assert.strictEqual(ws.pauseCount, 0)
        const reader = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))
        assert.strictEqual(ws.resumeCount, 0)

        ws.dispatch("message", { data: "hello" })

        // Observe delivery before flushing any scheduler or yielding to the runtime.
        assert.deepStrictEqual(reader.pollUnsafe(), Exit.succeed(["hello"]))
        assert.lengthOf(tasks, 0)
        assert.strictEqual(ws.pauseCount, 0)
        assert.strictEqual(ws.resumeCount, 0)
      }))

    it.effect("a fast consumer receives singleton batches throughout a synchronous burst", () =>
      Effect.gen(function*() {
        const { scheduler, tasks } = manualScheduler()
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const { pull } = yield* socket.reader.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
        const batches: Array<ReadonlyArray<Uint8Array | string>> = []
        const reader = yield* Effect.gen(function*() {
          for (let i = 0; i < 100; i++) batches.push(yield* pull)
        }).pipe(
          Effect.provideService(Scheduler.Scheduler, scheduler),
          Effect.forkChild({ startImmediately: true })
        )

        for (let i = 0; i < 100; i++) {
          ws.dispatch("message", { data: String(i) })
          assert.deepStrictEqual(batches[i], [String(i)])
        }

        assert.deepStrictEqual(reader.pollUnsafe(), Exit.void)
        assert.lengthOf(tasks, 0)
      }))

    it.effect("batches frames in order while the consumer is busy", () =>
      Effect.gen(function*() {
        const { flush, scheduler, tasks } = manualScheduler()
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const { pull } = yield* socket.reader.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
        const busy = Latch.makeUnsafe(false)
        const batches: Array<ReadonlyArray<Uint8Array | string>> = []
        const reader = yield* Effect.gen(function*() {
          batches.push(yield* pull)
          yield* busy.await
          batches.push(yield* pull)
        }).pipe(Effect.forkChild({ startImmediately: true }))

        ws.dispatch("message", { data: "first" })
        // Let the dispatcher baseline reach the same busy-consumer state.
        flush()
        assert.deepStrictEqual(batches, [["first"]])
        const binary = new Uint8Array([1, 2])
        ws.dispatch("message", { data: "hello" })
        ws.dispatch("message", { data: binary.buffer })
        ws.dispatch("message", { data: "world" })

        assert.deepStrictEqual(batches, [["first"]])
        assert.lengthOf(tasks, 0)
        yield* busy.open
        yield* Fiber.join(reader)
        assert.deepStrictEqual(batches, [["first"], ["hello", binary, "world"]])
      }))

    it.effect("pauses at the highWaterMark and resumes after draining", () =>
      Effect.gen(function*() {
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: 10 })
        const { pull } = yield* socket.reader

        ws.dispatch("message", { data: "hello" })
        assert.strictEqual(ws.pauseCount, 0)
        ws.dispatch("message", { data: "world" })
        assert.strictEqual(ws.pauseCount, 1)

        assert.deepStrictEqual(yield* pull, ["hello", "world"])
        assert.strictEqual(ws.resumeCount, 1)
      }))

    it.effect("counts text frames toward the highWaterMark by UTF-8 byte length", () =>
      Effect.gen(function*() {
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: 3 })
        const { pull } = yield* socket.reader

        ws.dispatch("message", { data: "€" })

        assert.strictEqual(ws.pauseCount, 1)
        assert.deepStrictEqual(yield* pull, ["€"])
      }))

    it.effect("uses the default highWaterMark for pausable sockets", () =>
      Effect.gen(function*() {
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const { pull } = yield* socket.reader
        const payload = "a".repeat(64 * 1024)

        ws.dispatch("message", { data: payload })
        assert.strictEqual(ws.pauseCount, 1)
        assert.deepStrictEqual(yield* pull, [payload])
        assert.strictEqual(ws.resumeCount, 1)
      }))

    it.effect("preserves frames after a pending pull is interrupted", () =>
      Effect.gen(function*() {
        const { flush, scheduler } = manualScheduler()
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const { pull } = yield* socket.reader.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
        const cancelled = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))
        yield* Fiber.interrupt(cancelled)

        ws.dispatch("message", { data: "buffered" })
        assert.deepStrictEqual(yield* pull, ["buffered"])

        const next = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))
        ws.dispatch("message", { data: "next" })
        flush()
        assert.deepStrictEqual(yield* Fiber.join(next), ["next"])
      }))

    for (const type of ["close", "error"] as const) {
      for (const waiting of [false, true]) {
        it.effect(`drains buffered frames before ${type} failure (${waiting ? "waiting" : "busy"} consumer)`, () =>
          Effect.gen(function*() {
            const { flush, scheduler } = manualScheduler()
            const ws = new TestWebSocket(Latch.makeUnsafe(false))
            ws.readyState = 1
            const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
            const { pull } = yield* socket.reader.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
            const reader = waiting ? yield* pull.pipe(Effect.forkChild({ startImmediately: true })) : undefined
            const event = { code: 1006, reason: "connection lost" }
            const error = new Socket.SocketError({
              reason: type === "close"
                ? new Socket.SocketCloseError({ code: 1006, closeReason: "connection lost" })
                : new Socket.SocketReadError({ cause: event })
            })

            ws.dispatch("message", { data: "first" })
            ws.dispatch("message", { data: "second" })
            ws.dispatch(type, event)
            flush()

            // Immediate delivery may split the pending pull from the backlog.
            const frames = [...(reader === undefined ? yield* pull : yield* Fiber.join(reader))]
            if (frames.length === 1) frames.push(...(yield* pull))
            assert.deepStrictEqual(frames, ["first", "second"])
            assert.deepStrictEqual(yield* Effect.exit(pull), Exit.fail(error))
            assert.deepStrictEqual(yield* Effect.exit(pull), Exit.fail(error))
          }))
      }
    }

    it.effect("fails a pending pull and removes listeners when the reader scope closes", () =>
      Effect.gen(function*() {
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const scope = yield* Scope.make()
        const { pull } = yield* socket.reader.pipe(Scope.provide(scope))
        const reader = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))

        yield* Scope.close(scope, Exit.void)

        assert.deepStrictEqual(
          yield* Fiber.await(reader),
          Exit.fail(
            new Socket.SocketError({
              reason: new Socket.SocketCloseError({ code: 1006 })
            })
          )
        )
        for (const type of ["open", "message", "error", "close"] as const) {
          assert.strictEqual(ws.listenerCount(type), 0)
        }
      }))

    it.effect("drains browser backlog before reporting overflow above the highWaterMark", () =>
      Effect.gen(function*() {
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        // Browser WebSockets do not expose transport pause/resume methods.
        const browser: Socket.WebSocketLike = {
          readyState: 1,
          addEventListener: ws.addEventListener.bind(ws),
          removeEventListener: ws.removeEventListener.bind(ws),
          close: ws.close.bind(ws),
          send: ws.send.bind(ws)
        }
        const socket = yield* Socket.fromWebSocket(Effect.succeed(browser), { highWaterMark: 3 })
        const { pull } = yield* socket.reader

        ws.dispatch("message", { data: "€" })
        assert.deepStrictEqual(yield* pull, ["€"])
        ws.dispatch("message", { data: "€" })
        ws.dispatch("message", { data: new Uint8Array([1]) })
        assert.deepStrictEqual(yield* pull, ["€", new Uint8Array([1])])
        assert.deepStrictEqual(
          yield* Effect.exit(pull),
          Exit.fail(
            new Socket.SocketError({
              reason: new Socket.SocketReadError({ cause: new Error("Socket highWaterMark of 3 bytes exceeded") })
            })
          )
        )
        assert.strictEqual(ws.pauseCount, 0)
        assert.strictEqual(ws.resumeCount, 0)
      }))
  })

  describe("toChannel", () => {
    it.effect("reports a write failure while a pull is suspended", () =>
      Effect.gen(function*() {
        const writeError = new Socket.SocketError({
          reason: new Socket.SocketWriteError({ cause: new Error("write failed") })
        })
        // an idle reader that only fails once its acquisition scope closes,
        // which is the whole reason `toChannel` needs no per-pull race
        const socket = Socket.make({
          reader: Effect.gen(function*() {
            const closed = Latch.makeUnsafe(false)
            yield* Effect.addFinalizer(() => closed.open)
            return {
              pull: Effect.andThen(
                closed.await,
                Effect.fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) }))
              ),
              upgrade: Socket.SocketUpgradeError.unsupported
            }
          }),
          writer: Effect.succeed({
            write: () => Effect.fail(writeError),
            writeAll: () => Effect.fail(writeError)
          })
        })

        const exit = yield* Stream.make("hello").pipe(
          Stream.encodeText,
          Stream.pipeThroughChannel(Socket.toChannel(socket)),
          Stream.runDrain,
          Effect.exit
        )

        assert.deepStrictEqual(exit, Exit.fail(writeError))
      }))
  })
})
