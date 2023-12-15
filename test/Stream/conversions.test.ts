import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as Take from "effect/Take"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.effect("toQueue", () =>
    Effect.gen(function*($) {
      const chunk = Chunk.make(1, 2, 3)
      const stream = pipe(
        Stream.fromChunk(chunk),
        Stream.flatMap(Stream.succeed)
      )
      const result = yield* $(
        stream,
        Stream.toQueue({ capacity: 1_000 }),
        Effect.flatMap((queue) =>
          pipe(
            Queue.size(queue),
            Effect.repeatWhile((size) => size !== chunk.length + 1),
            Effect.zipRight(Queue.takeAll(queue))
          )
        ),
        Effect.scoped
      )
      const expected = pipe(
        chunk,
        Chunk.map(Take.of),
        Chunk.append(Take.end)
      )
      assert.deepStrictEqual(Array.from(result), Array.from(expected))
    }))

  it.effect("toQueueUnbounded", () =>
    Effect.gen(function*($) {
      const chunk = Chunk.make(1, 2, 3)
      const stream = pipe(
        Stream.fromChunk(chunk),
        Stream.flatMap(Stream.succeed)
      )
      const result = yield* $(
        Stream.toQueue(stream, { strategy: "unbounded" }),
        Effect.flatMap((queue) =>
          pipe(
            Queue.size(queue),
            Effect.repeatWhile((size) => size !== chunk.length + 1),
            Effect.zipRight(Queue.takeAll(queue))
          )
        ),
        Effect.scoped
      )
      const expected = pipe(
        chunk,
        Chunk.map(Take.of),
        Chunk.append(Take.end)
      )
      assert.deepStrictEqual(Array.from(result), Array.from(expected))
    }))

  it.effect("toQueueOfElements - propagates defects", () =>
    Effect.gen(function*($) {
      const queue = yield* $(
        Stream.dieMessage("die"),
        Stream.toQueueOfElements({ capacity: 1 }),
        Effect.flatMap(Queue.take),
        Effect.scoped
      )
      assert.deepStrictEqual(queue, Exit.die(new Cause.RuntimeException("die")))
    }))
})
