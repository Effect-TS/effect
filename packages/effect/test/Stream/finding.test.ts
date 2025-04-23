import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("find", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const f = (n: number) => n === 4
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.find(f), Stream.runCollect),
        result2: pipe(
          stream,
          Stream.runCollect,
          Effect.map(Chunk.findFirst(f)),
          Effect.map(Option.match({
            onNone: () => Chunk.empty<number>(),
            onSome: Chunk.of
          }))
        )
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("findEffect - simple example", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const f = (n: number) => Effect.succeed(n === 4)
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.findEffect(f), Stream.runCollect),
        result2: pipe(
          Stream.runCollect(stream),
          Effect.flatMap((chunk) =>
            pipe(
              Effect.findFirst(chunk, f),
              Effect.map(Option.match({
                onNone: () => Chunk.empty<number>(),
                onSome: Chunk.of
              }))
            )
          )
        )
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("findEffect - throws correct error", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.findEffect((n) =>
          n === 3 ?
            Effect.fail("boom") :
            Effect.succeed(false)
        ),
        Stream.either,
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result),
        [Either.left("boom")]
      )
    }))
})
