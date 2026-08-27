import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Latch from "effect/Latch"
import * as Scheduler from "effect/Scheduler"
import * as Stream from "effect/Stream"
import * as Socket from "effect/unstable/socket/Socket"

type EventType = "open" | "message" | "error" | "close"

class TestWebSocket implements Socket.WebSocketLike {
  readonly listeners = new Map<
    EventType,
    Set<{ readonly listener: (event: Socket.WebSocketEvent) => void; readonly once: boolean }>
  >()
  readyState = 0

  constructor(readonly openListenerAttached: Latch.Latch) {}

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

describe("Socket", () => {
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

    it.effect("uses the Scheduler service to deliver buffered messages", () =>
      Effect.gen(function*() {
        const tasks: Array<() => void> = []
        const scheduler: Scheduler.Scheduler = {
          executionMode: "sync",
          shouldYield: () => false,
          makeDispatcher: () => ({
            scheduleTask(task) {
              tasks.push(task)
            },
            flush() {
              while (tasks.length > 0) tasks.shift()!()
            }
          })
        }
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
        const pull = yield* socket.reader.pipe(
          Effect.provideService(Scheduler.Scheduler, scheduler)
        )
        const reader = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))

        ws.dispatch("message", { data: "hello" })

        assert.isUndefined(reader.pollUnsafe())
        assert.lengthOf(tasks, 1)
        scheduler.makeDispatcher().flush()
        assert.deepStrictEqual(yield* Fiber.join(reader), ["hello"])
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
            return Effect.andThen(
              closed.await,
              Effect.fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) }))
            )
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
