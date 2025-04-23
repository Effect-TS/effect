import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("changes", () =>
    Effect.gen(function*() {
      const stream = Stream.range(0, 19)
      const result = yield* pipe(
        stream,
        Stream.changes,
        Stream.runCollect
      )
      const expected = yield* pipe(
        stream,
        Stream.runCollect,
        Effect.map(Chunk.reduce(Chunk.empty<number>(), (acc, n) =>
          acc.length === 0 || Chunk.unsafeGet(acc, 0) !== n ? Chunk.append(acc, n) : acc))
      )
      deepStrictEqual(Array.from(result), Array.from(expected))
    }))

  it.effect("changesWithEffect", () =>
    Effect.gen(function*() {
      const stream = Stream.range(0, 19)
      const result = yield* pipe(
        stream,
        Stream.changesWithEffect((left, right) => Effect.succeed(left === right)),
        Stream.runCollect
      )
      const expected = yield* pipe(
        stream,
        Stream.runCollect,
        Effect.map(
          Chunk.reduce(
            Chunk.empty<number>(),
            (acc, n) => acc.length === 0 || Chunk.unsafeGet(acc, 0) !== n ? Chunk.append(acc, n) : acc
          )
        )
      )
      deepStrictEqual(Array.from(result), Array.from(expected))
    }))
})
