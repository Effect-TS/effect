import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constTrue, pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("peel", () =>
    Effect.gen(function*($) {
      const sink = Sink.take<number>(3)
      const [peeled, rest] = yield* $(
        Stream.fromChunks(Chunk.range(1, 3), Chunk.range(4, 6)),
        Stream.peel(sink),
        Effect.flatMap(([peeled, rest]) =>
          pipe(
            Stream.runCollect(rest),
            Effect.map((rest) => [peeled, rest])
          )
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(Array.from(peeled), [1, 2, 3])
      assert.deepStrictEqual(Array.from(rest), [4, 5, 6])
    }))

  it.effect("peel - propagates errors", () =>
    Effect.gen(function*($) {
      const stream = Stream.repeatEffect(Effect.fail("fail"))
      const sink = Sink.fold<Chunk.Chunk<number>, number>(
        Chunk.empty(),
        constTrue,
        Chunk.append
      )
      const result = yield* $(
        stream,
        Stream.peel(sink),
        Effect.exit,
        Effect.scoped
      )
      assert.deepStrictEqual(result, Exit.fail("fail"))
    }))
})
