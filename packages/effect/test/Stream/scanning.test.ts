import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("scan", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const { result1, result2 } = yield* Effect.all({
        result1: pipe(stream, Stream.scan(0, (acc, curr) => acc + curr), Stream.runCollect),
        result2: pipe(
          Stream.runCollect(stream),
          Effect.map((chunk) =>
            pipe(
              Chunk.toReadonlyArray(chunk),
              Array.scan(0, (acc, curr) => acc + curr)
            )
          )
        )
      })
      deepStrictEqual(Chunk.toReadonlyArray(result1), result2)
    }))

  it.effect("scanReduce", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const result = yield* pipe(
        stream,
        Stream.scanReduce<number, number>((acc, curr) => acc + curr),
        Stream.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 3, 6, 10, 15])
    }))
})
