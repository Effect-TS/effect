import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Queue } from "effect"
import { Socket } from "effect/unstable/socket"

class TestWebSocket extends EventTarget {
  readonly readyState = 1
  closeCalls = 0

  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) {}

  close() {
    this.closeCalls++
  }

  emitMessage(data: string | Uint8Array) {
    this.dispatchEvent(new MessageEvent("message", { data }))
  }

  emitClose(code: number) {
    this.dispatchEvent(new CloseEvent("close", { code }))
  }
}

describe("Socket", () => {
  it.effect("provides the acquired WebSocket to raw message handlers", () =>
    Effect.gen(function*() {
      const webSocket = new TestWebSocket()
      const acquired = webSocket as unknown as globalThis.WebSocket
      const socket = yield* Socket.fromWebSocket(
        Effect.succeed(acquired),
        { closeCodeIsError: () => false }
      )
      const opened = yield* Deferred.make<void>()
      const received = yield* Queue.unbounded<readonly [string | Uint8Array, globalThis.WebSocket]>()
      const fiber = yield* socket.runRaw(
        (data) =>
          Effect.gen(function*() {
            const activeWebSocket = yield* Socket.WebSocket
            yield* Queue.offer(received, [data, activeWebSocket])
          }),
        { onOpen: Deferred.succeed(opened, void 0) }
      ).pipe(Effect.forkChild)

      yield* Deferred.await(opened)

      webSocket.emitMessage("text")
      const text = yield* Queue.take(received)
      assert.strictEqual(text[0], "text")
      assert.strictEqual(text[1], acquired)

      const bytes = new Uint8Array([1, 2, 3])
      webSocket.emitMessage(bytes)
      const binary = yield* Queue.take(received)
      assert.strictEqual(binary[0], bytes)
      assert.strictEqual(binary[1], acquired)

      webSocket.emitClose(1000)
      yield* Fiber.join(fiber)
    }))

  it.effect("releases the acquired WebSocket when interrupted", () =>
    Effect.gen(function*() {
      const webSocket = new TestWebSocket()
      const socket = yield* Socket.fromWebSocket(
        Effect.acquireRelease(
          Effect.succeed(webSocket as unknown as globalThis.WebSocket),
          () => Effect.sync(() => webSocket.close())
        )
      )
      const opened = yield* Deferred.make<void>()
      const fiber = yield* socket.runRaw(() => {}, {
        onOpen: Deferred.succeed(opened, void 0)
      }).pipe(Effect.forkChild)

      yield* Deferred.await(opened)
      yield* Fiber.interrupt(fiber)

      assert.strictEqual(webSocket.closeCalls, 1)
    }))
})
