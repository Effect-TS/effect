import { assert, it } from "@effect/vitest"
import { Effect, Exit, Sink, Stream } from "effect"

// Stream.tapSink (packages/effect/src/Stream.ts:2213-2217) ignores a sink failure recorded after
// end-of-stream. Its signature (Stream.ts:2166) includes the sink error E2, and Stream.test.ts
// "sink that fails before stream" requires sink failures to propagate.
it.effect("tapSink propagates a sink failure that happens after end-of-stream", () =>
  Effect.gen(function*() {
    const sink = Sink.collect<number>().pipe(Sink.mapEffect(() => Effect.fail("sink-end-failure")))
    const exit = yield* Stream.make(1, 2, 3).pipe(Stream.tapSink(sink), Stream.runCollect, Effect.exit)
    assert.deepStrictEqual(exit, Exit.fail("sink-end-failure"))
  }))
