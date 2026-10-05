import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Option, Sink, Stream } from "effect"

describe("Stream.tapSink", () => {
  // Stream.ts tapSink (~L2137): "Runs a sink for all stream elements while still emitting them downstream."
  // A sink that completes while an upstream pull is suspended must not stop the stream from completing
  // (cf. Stream.test.ts "sink that is done before stream").
  it.live("sink finishing during an upstream pull still lets the stream complete", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const finished = yield* Deferred.make<void>()
      const source = Stream.fromEffect(Effect.gen(function*() {
        yield* Deferred.succeed(started, undefined)
        yield* Deferred.await(finished)
        yield* Effect.yieldNow
        return 1
      }))
      const sink = Sink.fromEffect(Effect.andThen(Deferred.await(started), Deferred.succeed(finished, undefined)))
      const result = yield* source.pipe(Stream.tapSink(sink), Stream.runCollect, Effect.timeoutOption("1 second"))
      assert.deepStrictEqual(result, Option.some([1]))
    }))
})
