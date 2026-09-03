import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Socket from "effect/unstable/socket/Socket"

class Frames extends EventTarget implements Socket.WebSocketLike {
  readonly readyState = 1
  close() {}
  send() {}
  emit(type: "message" | "close", event: Socket.WebSocketEvent) {
    this.dispatchEvent(Object.assign(new Event(type), event))
  }
}

class PausableFrames extends Frames {
  pauseCount = 0
  resumeCount = 0
  pause() {
    this.pauseCount++
  }
  resume() {
    this.resumeCount++
  }
}

const encoder = new TextEncoder()
const binaryEuro = encoder.encode("€")
const binaryAstral = encoder.encode("🙂")
const byteView = new Uint8Array([100, 1, 2, 3, 100]).subarray(1, 4)
const cases: ReadonlyArray<{
  readonly name: string
  readonly frames: Array<string | Uint8Array>
  readonly highWaterMark: number
  readonly overflow: boolean
}> = [
  { name: "euro text overflow", frames: ["€"], highWaterMark: 2, overflow: true },
  { name: "euro binary overflow control", frames: [binaryEuro], highWaterMark: 2, overflow: true },
  { name: "euro text exact limit", frames: ["€"], highWaterMark: 3, overflow: false },
  { name: "euro binary exact limit", frames: [binaryEuro], highWaterMark: 3, overflow: false },
  { name: "astral text overflow", frames: ["🙂"], highWaterMark: 3, overflow: true },
  { name: "astral binary overflow control", frames: [binaryAstral], highWaterMark: 3, overflow: true },
  { name: "astral text exact limit", frames: ["🙂"], highWaterMark: 4, overflow: false },
  { name: "astral binary exact limit", frames: [binaryAstral], highWaterMark: 4, overflow: false },
  { name: "ASCII below limit", frames: ["a"], highWaterMark: 2, overflow: false },
  { name: "ASCII exact limit", frames: ["ab"], highWaterMark: 2, overflow: false },
  { name: "ASCII overflow", frames: ["abc"], highWaterMark: 2, overflow: true },
  { name: "two euros overflow", frames: ["€", "€"], highWaterMark: 5, overflow: true },
  { name: "two euros exact limit", frames: ["€", "€"], highWaterMark: 6, overflow: false },
  { name: "mixed text and bytes overflow", frames: ["€", new Uint8Array([1, 2])], highWaterMark: 4, overflow: true },
  {
    name: "mixed text and bytes exact limit",
    frames: ["€", new Uint8Array([1, 2])],
    highWaterMark: 5,
    overflow: false
  },
  { name: "binary byte view exact limit", frames: [byteView], highWaterMark: 3, overflow: false },
  { name: "binary byte view overflow", frames: [byteView], highWaterMark: 2, overflow: true },
  { name: "multiple ASCII exact limit", frames: ["a", "b"], highWaterMark: 2, overflow: false },
  { name: "multiple ASCII overflow", frames: ["a", "bc"], highWaterMark: 2, overflow: true }
]

describe("WebSocket UTF-8 byte watermark", () => {
  for (
    const { name, options } of [
      { name: "default unbounded", options: undefined },
      { name: "explicitly undefined watermark", options: { highWaterMark: undefined } }
    ]
  ) {
    it.effect(`preserves non-pausable frames with ${name}`, () =>
      Effect.gen(function*() {
        const ws = new Frames()
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), options)
        const { pull } = yield* socket.reader
        const expected = ["€".repeat(1024), "🙂".repeat(1024)]
        for (const data of expected) ws.emit("message", { data })
        ws.emit("close", { code: 1000, reason: "unbounded done" })
        assert.deepStrictEqual<ReadonlyArray<string | Uint8Array>>(yield* pull, expected)
        const error = yield* Effect.flip(pull)
        assert.strictEqual(error.reason._tag, "SocketCloseError")
      }))
  }

  for (const test of cases) {
    it.effect(test.name, () =>
      Effect.gen(function*() {
        const ws = new Frames()
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: test.highWaterMark })
        const { pull } = yield* socket.reader
        // There is intentionally no pending pull: every frame enters the buffer.
        for (const data of test.frames) ws.emit("message", { data })
        // A later clean close makes both base and fixed terminate deterministically;
        // it must not overwrite an already-recorded overflow error.
        ws.emit("close", { code: 1000, reason: "fixture done" })
        const frames = yield* pull
        const error = yield* Effect.flip(pull)
        console.log(
          "TEXT_WATERMARK " + JSON.stringify({
            name: test.name,
            highWaterMark: test.highWaterMark,
            expectedOverflow: test.overflow,
            frames,
            reason: error.reason._tag,
            cause: error.reason._tag === "SocketReadError" && error.reason.cause instanceof Error ?
              error.reason.cause.message :
              undefined
          })
        )
        assert.deepStrictEqual<ReadonlyArray<string | Uint8Array>>(frames, test.frames)
        for (let i = 0; i < frames.length; i++) assert.strictEqual(frames[i], test.frames[i])
        assert.strictEqual(error._tag, "SocketError")
        assert.strictEqual(yield* Effect.flip(pull), error)
        assert.strictEqual(error.reason._tag, test.overflow ? "SocketReadError" : "SocketCloseError")
        if (error.reason._tag === "SocketReadError") {
          assert.instanceOf(error.reason.cause, Error)
          if (error.reason.cause instanceof Error) {
            assert.strictEqual(
              error.reason.cause.message,
              `Socket highWaterMark of ${test.highWaterMark} bytes exceeded`
            )
          }
        } else if (error.reason._tag === "SocketCloseError") {
          assert.strictEqual(error.reason.code, 1000)
          assert.strictEqual(error.reason.closeReason, "fixture done")
        }
      }))
  }

  it.effect("resets non-pausable buffered byte count after each drain", () =>
    Effect.gen(function*() {
      const ws = new Frames()
      const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: 6 })
      const { pull } = yield* socket.reader
      for (const cycle of [["€", "€"], ["🙂", "ab"], [binaryEuro, binaryEuro]]) {
        for (const data of cycle) ws.emit("message", { data })
        const frames = yield* pull
        assert.deepStrictEqual<ReadonlyArray<string | Uint8Array>>(frames, cycle)
        for (let i = 0; i < frames.length; i++) assert.strictEqual(frames[i], cycle[i])
      }
      ws.emit("close", { code: 1000, reason: "drained" })
      const error = yield* Effect.flip(pull)
      assert.strictEqual(error.reason._tag, "SocketCloseError")
    }))

  for (
    const test of cases.filter((test) =>
      test.name.startsWith("euro") || test.name.startsWith("astral") || test.name.startsWith("ASCII") ||
      test.name.startsWith("two euros") || test.name.startsWith("mixed")
    )
  ) {
    it.effect(`pausable: ${test.name}`, () =>
      Effect.gen(function*() {
        const ws = new PausableFrames()
        const socket = yield* Socket.fromWebSocket(Effect.succeed(ws), { highWaterMark: test.highWaterMark })
        const { pull } = yield* socket.reader
        assert.strictEqual(ws.resumeCount, 0)
        let bytes = 0
        for (const data of test.frames) {
          ws.emit("message", { data })
          bytes += typeof data === "string" ? encoder.encode(data).byteLength : data.byteLength
          console.log(
            "PAUSABLE_TEXT " + JSON.stringify({
              name: test.name,
              bytes,
              highWaterMark: test.highWaterMark,
              pauseCount: ws.pauseCount
            })
          )
          assert.strictEqual(ws.pauseCount, bytes >= test.highWaterMark ? 1 : 0)
        }
        const shouldPause = bytes >= test.highWaterMark
        const frames = yield* pull
        assert.deepStrictEqual<ReadonlyArray<string | Uint8Array>>(frames, test.frames)
        for (let i = 0; i < frames.length; i++) assert.strictEqual(frames[i], test.frames[i])
        assert.strictEqual(ws.resumeCount, shouldPause ? 1 : 0)
        // Repeating the same batch must produce exactly one new threshold pause
        // and one drain-resume, not accumulate bytes from the previous batch.
        for (const data of test.frames) ws.emit("message", { data })
        assert.strictEqual(ws.pauseCount, shouldPause ? 2 : 0)
        assert.deepStrictEqual<ReadonlyArray<string | Uint8Array>>(yield* pull, test.frames)
        assert.strictEqual(ws.resumeCount, shouldPause ? 2 : 0)
        ws.emit("close", { code: 1000, reason: "pausable done" })
        const error = yield* Effect.flip(pull)
        assert.strictEqual(error.reason._tag, "SocketCloseError")
      }))
  }
})
