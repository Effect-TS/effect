import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("interleave", () =>
    Effect.gen(function*() {
      const stream1 = Stream.make(2, 3)
      const stream2 = Stream.make(5, 6, 7)
      const result = yield* pipe(
        stream1,
        Stream.interleave(stream2),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [2, 5, 3, 6, 7])
    }))

  it.effect("interleaveWith", () =>
    Effect.gen(function*() {
      const interleave = (
        bools: Chunk.Chunk<boolean>,
        numbers1: Chunk.Chunk<number>,
        numbers2: Chunk.Chunk<number>
      ): Chunk.Chunk<number> =>
        pipe(
          Chunk.head(bools),
          Option.map((head) => {
            if (head) {
              if (Chunk.isNonEmpty(numbers1)) {
                const head = pipe(numbers1, Chunk.unsafeGet(0))
                const tail = pipe(numbers1, Chunk.drop(1))
                return pipe(
                  interleave(pipe(bools, Chunk.drop(1)), tail, numbers2),
                  Chunk.prepend(head)
                )
              }
              if (Chunk.isNonEmpty(numbers2)) {
                return interleave(pipe(bools, Chunk.drop(1)), Chunk.empty<number>(), numbers2)
              }
              return Chunk.empty<number>()
            }
            if (Chunk.isNonEmpty(numbers2)) {
              const head = pipe(numbers2, Chunk.unsafeGet(0))
              const tail = pipe(numbers2, Chunk.drop(1))
              return pipe(
                interleave(pipe(bools, Chunk.drop(1)), numbers1, tail),
                Chunk.prepend(head)
              )
            }
            if (Chunk.isNonEmpty(numbers1)) {
              return interleave(pipe(bools, Chunk.drop(1)), numbers1, Chunk.empty<number>())
            }
            return Chunk.empty<number>()
          }),
          Option.getOrElse(() => Chunk.empty<number>())
        )
      const boolStream = Stream.make(true, true, false, true, false)
      const stream1 = Stream.make(1, 2, 3, 4, 5)
      const stream2 = Stream.make(4, 5, 6, 7, 8)
      const interleavedStream = yield* pipe(
        stream1,
        Stream.interleaveWith(stream2, boolStream),
        Stream.runCollect
      )
      const bools = yield* (Stream.runCollect(boolStream))
      const numbers1 = yield* (Stream.runCollect(stream1))
      const numbers2 = yield* (Stream.runCollect(stream2))
      const interleavedChunks = interleave(bools, numbers1, numbers2)
      deepStrictEqual(Array.from(interleavedStream), Array.from(interleavedChunks))
    }))
})
