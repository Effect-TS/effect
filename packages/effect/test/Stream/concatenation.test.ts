import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("concat - simple example", () =>
    Effect.gen(function*() {
      const stream1 = Stream.make(1, 2, 3)
      const stream2 = Stream.make(4, 5, 6)
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(
          stream1,
          Stream.runCollect,
          Effect.zipWith(
            pipe(stream2, Stream.runCollect),
            (chunk1, chunk2) => pipe(chunk1, Chunk.appendAll(chunk2))
          )
        ),
        result2: pipe(
          stream1,
          Stream.concat(stream2),
          Stream.runCollect
        )
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("concat - finalizer ordering", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<string>()))
      yield* pipe(
        Stream.finalizer(Ref.update(ref, Chunk.append("Second"))),
        Stream.concat(Stream.finalizer(Ref.update(ref, Chunk.append("First")))),
        Stream.runDrain
      )
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), ["Second", "First"])
    }))
})
