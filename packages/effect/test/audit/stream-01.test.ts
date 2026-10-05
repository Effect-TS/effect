import { assert, it } from "@effect/vitest"
import { Effect, Sink, Stream } from "effect"

// Stream.peel (src/Stream.ts:4546) promises the sink result plus "the remaining stream";
// Sink.take (src/Sink.ts:1153) returns excess elements of a pulled array as leftovers.
// peel runs the sink via Stream.run, which drops leftovers (src/Stream.ts:10742).
it.effect("peel keeps the sink's leftovers in the remaining stream", () =>
  Effect.gen(function*() {
    const [peeled, rest] = yield* Stream.peel(Stream.make(1, 2, 3, 4), Sink.take<number>(2))
    assert.deepStrictEqual([peeled, yield* Stream.runCollect(rest)], [[1, 2], [3, 4]])
  }).pipe(Effect.scoped))
