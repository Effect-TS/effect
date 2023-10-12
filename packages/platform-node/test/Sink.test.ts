import * as NodeSink from "@effect/platform-node/Sink"
import { Stream } from "effect"
import * as Effect from "effect/Effect"
import { Writable } from "stream"
import { describe, it } from "vitest"

describe("Sink", () => {
  it("should write to a stream", () =>
    Effect.gen(function*(_) {
      const items: Array<string> = []
      let destroyed = false
      const sink = NodeSink.fromWritable(
        () =>
          new Writable({
            construct(callback) {
              callback()
            },
            write(chunk, _encoding, callback) {
              items.push(chunk.toString())
              callback()
            },
            destroy(_error, callback) {
              destroyed = true
              callback(null)
            }
          }),
        () => "error"
      )
      yield* _(Stream.make("a", "b", "c"), Stream.run(sink))
      assert.deepEqual(items, ["a", "b", "c"])
      assert.strictEqual(destroyed, true)
    }).pipe(Effect.runPromise))

  it("write error", () =>
    Effect.gen(function*(_) {
      const items: Array<string> = []
      let destroyed = false
      const sink = NodeSink.fromWritable(
        () =>
          new Writable({
            construct(callback) {
              callback()
            },
            write(chunk, _encoding, callback) {
              items.push(chunk.toString())
              callback()
            },
            destroy(_error, callback) {
              destroyed = true
              callback(null)
            }
          }),
        () => "error"
      )
      const result = yield* _(Stream.fail("a"), Stream.run(sink), Effect.flip)
      assert.deepEqual(items, [])
      assert.strictEqual(result, "a")
      assert.strictEqual(destroyed, true)
    }).pipe(Effect.runPromise))

  it("endOnClose false", () =>
    Effect.gen(function*(_) {
      const items: Array<string> = []
      let destroyed = false
      const sink = NodeSink.fromWritable(
        () =>
          new Writable({
            construct(callback) {
              callback()
            },
            write(chunk, _encoding, callback) {
              items.push(chunk.toString())
              callback()
            },
            destroy(_error, callback) {
              destroyed = true
              callback(null)
            }
          }),
        () => "error",
        { endOnDone: false }
      )
      yield* _(Stream.make("a", "b", "c"), Stream.run(sink))
      assert.deepEqual(items, ["a", "b", "c"])
      assert.strictEqual(destroyed, false)
    }).pipe(Effect.runPromise))
})
