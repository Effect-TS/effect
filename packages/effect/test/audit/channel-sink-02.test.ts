import { assert, it } from "@effect/vitest"
import { Effect, Exit, Sink, Stream } from "effect"

// Sink.make (packages/effect/src/Sink.ts:354-361) is documented at Sink.ts:347-349 to
// "use the final effect's success value as the sink result", so running it must succeed.
it.effect("Sink.make uses the pipeline success value as the sink result", () =>
  Effect.gen(function*() {
    const sink = Sink.make<number>()(Stream.runSum)
    const exit = yield* Effect.exit(Stream.run(Stream.make(1, 2, 3), sink))
    assert.deepStrictEqual(exit, Exit.succeed(6))
  }))
