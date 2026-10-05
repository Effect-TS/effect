import { assert, it } from "@effect/vitest"
import { Effect, Option, Stream } from "effect"

// Stream.zipLatestAll (packages/effect/src/Stream.ts:3850-3861) parks each input's first element on
// `readyLatch` until every input has emitted. Per the zipLatestAll / zipLatest JSDoc, combinations are only
// produced after all inputs have emitted, so with an empty finite input the result is `[]` and the stream
// must complete (like `Stream.zip(Stream.empty, ...)` does).
it.live("zipLatest completes with no pairs when one finite input is empty", () =>
  Effect.gen(function*() {
    const result = yield* Stream.zipLatest(Stream.empty, Stream.succeed(1)).pipe(
      Stream.runCollect,
      Effect.timeoutOption("250 millis")
    )
    assert.deepStrictEqual(result, Option.some([]))
  }))
