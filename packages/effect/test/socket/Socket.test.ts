import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Latch from "effect/Latch"
import * as Scope from "effect/Scope"
import * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"
import { TestClock } from "effect/testing"

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

  close(): void {
    this.readyState = 2
  }
  send(_data: string | Uint8Array<ArrayBuffer>): void {}
}

class BufferedWebSocket extends TestWebSocket {
  private buffered = 0
  bufferChecks = 0
  get bufferedAmount(): number {
    this.bufferChecks++
    return this.buffered
  }
  set bufferedAmount(value: number) {
    this.buffered = value
  }
  readonly sent: Array<string | Uint8Array> = []

  override send(data: string | Uint8Array<ArrayBuffer>): void {
    this.sent.push(data)
    this.bufferedAmount += typeof data === "string" ? new TextEncoder().encode(data).byteLength : data.byteLength
  }
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
    describe("write backpressure", () => {
      it.effect("waits above the mark and resumes once drained to the mark", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 5 })
          yield* socket.reader
          const writer = yield* socket.writer

          yield* writer.write("hello")
          const pending = yield* writer.write("!").pipe(Effect.forkChild({ startImmediately: true }))
          assert.deepStrictEqual(ws.sent, ["hello", "!"])
          assert.isUndefined(pending.pollUnsafe())
          yield* TestClock.adjust(100)
          assert.isUndefined(pending.pollUnsafe())

          ws.bufferedAmount = 5
          yield* TestClock.adjust(10)
          yield* Fiber.join(pending)
        }))

      it.effect("rechecks a fast-draining transport on the next event-loop turn", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
          yield* socket.reader
          const writer = yield* socket.writer
          const pending = yield* writer.write("a").pipe(Effect.forkChild({ startImmediately: true }))
          assert.isUndefined(pending.pollUnsafe())
          ws.bufferedAmount = 0
          yield* TestClock.adjust(1)
          assert.isDefined(pending.pollUnsafe())
        }))

      it.effect("counts UTF-8 bytes and only a typed array's view", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 4 })
          yield* socket.reader
          const writer = yield* socket.writer
          yield* writer.write(new Uint8Array(100).subarray(0, 2))
          const pending = yield* writer.write("€").pipe(Effect.forkChild({ startImmediately: true }))
          assert.strictEqual(ws.bufferedAmount, 5)
          assert.isUndefined(pending.pollUnsafe())
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(pending)
        }))

      it.effect("backpressures inside a batch without splitting oversized frames", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 2 })
          yield* socket.reader
          const writer = yield* socket.writer
          const pending = yield* writer.writeAll(["oversized", "second", "third"]).pipe(
            Effect.forkChild({ startImmediately: true })
          )
          assert.deepStrictEqual(ws.sent, ["oversized"])
          for (const expected of ["second", "third"]) {
            ws.bufferedAmount = 0
            yield* TestClock.adjust(10)
            assert.strictEqual(ws.sent.at(-1), expected)
            assert.isUndefined(pending.pollUnsafe())
          }
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(pending)
          assert.deepStrictEqual(ws.sent, ["oversized", "second", "third"])
        }))

      it.effect("serializes concurrent batches and subsequent single writes", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
          yield* socket.reader
          const writer = yield* socket.writer
          const first = yield* writer.writeAll(["a", "b"]).pipe(Effect.forkChild({ startImmediately: true }))
          const second = yield* writer.writeAll(["c", "d"]).pipe(Effect.forkChild({ startImmediately: true }))
          const third = yield* writer.write("e").pipe(Effect.forkChild({ startImmediately: true }))
          assert.deepStrictEqual(ws.sent, ["a"])
          for (const expected of ["b", "c", "d", "e"]) {
            ws.bufferedAmount = 0
            yield* TestClock.adjust(10)
            assert.strictEqual(ws.sent.at(-1), expected)
          }
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(first)
          yield* Fiber.join(second)
          yield* Fiber.join(third)
          assert.deepStrictEqual(ws.sent, ["a", "b", "c", "d", "e"])
        }))

      it.effect("a looping producer gives a queued writer a turn between writes", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
          yield* socket.reader
          const writer = yield* socket.writer
          const first = yield* Effect.gen(function*() {
            for (let i = 0; i < 4; i++) yield* writer.write(`first${i}`)
          }).pipe(Effect.forkChild({ startImmediately: true }))
          const queued = yield* writer.write("queued").pipe(Effect.forkChild({ startImmediately: true }))
          assert.deepStrictEqual(ws.sent, ["first0"])
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          assert.deepStrictEqual(ws.sent, ["first0", "queued"])
          for (let i = 1; i < 4; i++) {
            ws.bufferedAmount = 0
            yield* TestClock.adjust(10)
            assert.strictEqual(ws.sent.at(-1), `first${i}`)
          }
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(first)
          yield* Fiber.join(queued)
        }))

      it.effect("interruption releases the lock without bypassing existing congestion", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
          yield* socket.reader
          const writer = yield* socket.writer
          const first = yield* writer.writeAll(["a", "not sent"]).pipe(Effect.forkChild({ startImmediately: true }))
          yield* Fiber.interrupt(first)
          const checks = ws.bufferChecks
          yield* TestClock.adjust(100)
          assert.strictEqual(ws.bufferChecks, checks)
          const second = yield* writer.write("b").pipe(Effect.forkChild({ startImmediately: true }))
          assert.deepStrictEqual(ws.sent, ["a"])
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          assert.deepStrictEqual(ws.sent, ["a", "b"])
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(second)
        }))

      it.effect.each(["close", "error"] as const)(
        "%s fails active and queued writes without waiting for a poll",
        (type) =>
          Effect.gen(function*() {
            const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
            ws.readyState = 1
            const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
            yield* socket.reader
            const writer = yield* socket.writer
            const first = yield* writer.write("a").pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
            const second = yield* writer.write("b").pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
            ws.dispatch(type, { code: 1006 })
            assert.isTrue(Exit.isFailure(yield* Fiber.join(first)))
            assert.isTrue(Exit.isFailure(yield* Fiber.join(second)))
            assert.deepStrictEqual(ws.sent, ["a"])
            const checks = ws.bufferChecks
            yield* TestClock.adjust(100)
            assert.strictEqual(ws.bufferChecks, checks)
          })
      )

      it.effect("scope closure fails blocked writes and does not replay a partial batch on reconnect", () =>
        Effect.gen(function*() {
          const firstWs = new BufferedWebSocket(Latch.makeUnsafe(false))
          firstWs.readyState = 1
          const secondWs = new BufferedWebSocket(Latch.makeUnsafe(false))
          secondWs.readyState = 1
          let ws = firstWs
          const socket = yield* Socket.fromWebSocket(Effect.sync(() => ws), { writeHighWaterMark: 0 })
          const scope = yield* Scope.make()
          yield* Scope.provide(socket.reader, scope)
          const writer = yield* socket.writer
          const first = yield* writer.writeAll(["a", "never replay"]).pipe(
            Effect.exit,
            Effect.forkChild({ startImmediately: true })
          )
          const queued = yield* writer.write("also never replay").pipe(
            Effect.exit,
            Effect.forkChild({ startImmediately: true })
          )
          yield* Scope.close(scope, Exit.void)
          assert.isTrue(Exit.isFailure(yield* Fiber.join(first)))
          assert.isTrue(Exit.isFailure(yield* Fiber.join(queued)))
          assert.strictEqual(firstWs.listenerCount("close"), 0)

          const next = yield* writer.write("new connection").pipe(Effect.forkChild({ startImmediately: true }))
          ws = secondWs
          yield* socket.reader
          yield* TestClock.adjust(10)
          assert.deepStrictEqual(firstWs.sent, ["a"])
          assert.deepStrictEqual(secondWs.sent, ["new connection"])
          secondWs.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(next)
        }))

      it.effect("an old reader scope cannot disconnect a replacement connection", () =>
        Effect.gen(function*() {
          const old = new BufferedWebSocket(Latch.makeUnsafe(false))
          old.readyState = 1
          const replacement = new BufferedWebSocket(Latch.makeUnsafe(false))
          replacement.readyState = 1
          let ws = old
          const socket = yield* Socket.fromWebSocket(Effect.sync(() => ws), { writeHighWaterMark: 0 })
          const oldScope = yield* Scope.make()
          yield* Scope.provide(socket.reader, oldScope)
          const writer = yield* socket.writer
          const pending = yield* writer.write("old").pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
          ws = replacement
          yield* socket.reader
          yield* Scope.close(oldScope, Exit.void)
          assert.isTrue(Exit.isFailure(yield* Fiber.join(pending)))
          const next = yield* writer.write("new").pipe(Effect.forkChild({ startImmediately: true }))
          assert.deepStrictEqual(replacement.sent, ["new"])
          replacement.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(next)
        }))

      it.effect("an interrupted queued writer never sends its frame", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
          yield* socket.reader
          const writer = yield* socket.writer
          const first = yield* writer.write("a").pipe(Effect.forkChild({ startImmediately: true }))
          const queued = yield* writer.write("cancelled").pipe(Effect.forkChild({ startImmediately: true }))
          yield* Fiber.interrupt(queued)
          ws.bufferedAmount = 0
          yield* TestClock.adjust(10)
          yield* Fiber.join(first)
          assert.deepStrictEqual(ws.sent, ["a"])
        }))

      it.effect("a CloseEvent bypasses blocked writes", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark: 0 })
          yield* socket.reader
          const writer = yield* socket.writer
          const pending = yield* writer.write("a").pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
          yield* writer.write(new Socket.CloseEvent())
          assert.strictEqual(ws.readyState, 2)
          yield* TestClock.adjust(10)
          assert.isTrue(Exit.isFailure(yield* Fiber.join(pending)))
        }))

      it.effect("maps synchronous send errors and releases the write lock", () =>
        Effect.gen(function*() {
          const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
          ws.readyState = 1
          const cause = new Error("send failed")
          let fail = true
          ws.send = (data) => {
            if (fail) throw cause
            ws.sent.push(data)
          }
          const socket = yield* Socket.fromWebSocket(Effect.succeed(ws))
          yield* socket.reader
          const writer = yield* socket.writer
          assert.deepStrictEqual(
            yield* Effect.exit(writer.write("a")),
            Exit.fail(new Socket.SocketError({ reason: new Socket.SocketWriteError({ cause }) }))
          )
          fail = false
          yield* writer.write("b")
          assert.deepStrictEqual(ws.sent, ["b"])
        }))

      it.effect("uses the default mark and supports context configuration and an option override", () =>
        Effect.gen(function*() {
          for (
            const [options, provided, bytes] of [
              [undefined, undefined, 64 * 1024 + 1],
              [undefined, 3, 4],
              [{ writeHighWaterMark: 5 }, 3, 6]
            ] as const
          ) {
            const ws = new BufferedWebSocket(Latch.makeUnsafe(false))
            ws.readyState = 1
            const make = Socket.fromWebSocket(Effect.succeed(ws), options)
            const socket = yield* provided === undefined
              ? make
              : Effect.provideService(make, Socket.WriteHighWaterMark, provided)
            yield* socket.reader
            const writer = yield* socket.writer
            const pending = yield* writer.write(new Uint8Array(bytes)).pipe(
              Effect.forkChild({ startImmediately: true })
            )
            assert.isUndefined(pending.pollUnsafe())
            ws.bufferedAmount = bytes - 1
            yield* TestClock.adjust(10)
            yield* Fiber.join(pending)
          }
        }))

      it.effect.each([-1, -Infinity, NaN])(
        "rejects an invalid write high-water mark: %s",
        (writeHighWaterMark) =>
          Effect.gen(function*() {
            const ws = new TestWebSocket(Latch.makeUnsafe(false))
            const exit = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark }).pipe(Effect.exit)
            assert.deepStrictEqual(exit, Exit.die(new RangeError("writeHighWaterMark must be non-negative")))
          })
      )

      it.effect("preserves unbounded writes for legacy adapters and an infinite mark", () =>
        Effect.gen(function*() {
          for (
            const [ws, writeHighWaterMark] of [
              [new TestWebSocket(Latch.makeUnsafe(false)), undefined],
              [new TestWebSocket(Latch.makeUnsafe(false)), 0],
              [new BufferedWebSocket(Latch.makeUnsafe(false)), Infinity]
            ] as const
          ) {
            ws.readyState = 1
            const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { writeHighWaterMark })
            yield* socket.reader
            const writer = yield* socket.writer
            yield* writer.writeAll(["a", "b", "c"])
          }
        }))
    })

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

    it.effect("pauses at the highWaterMark and resumes after draining", () =>
      Effect.gen(function*() {
        const ws = new TestWebSocket(Latch.makeUnsafe(false))
        ws.readyState = 1
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: 10 })
        const { pull } = yield* socket.reader
        const firstPull = yield* pull.pipe(Effect.forkChild({ startImmediately: true }))

        ws.dispatch("message", { data: "first" })
        assert.deepStrictEqual(yield* Fiber.join(firstPull), ["first"])

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
