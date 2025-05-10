import { describe, it } from "@effect/vitest"
import { assertLeft, assertRight, deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { constTrue, pipe } from "effect/Function"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("drop - simple example", () =>
    Effect.gen(function*() {
      const n = 2
      const stream = Stream.make(1, 2, 3, 4, 5)
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.drop(n), Stream.runCollect),
        result2: pipe(stream, Stream.runCollect, Effect.map(Chunk.drop(n)))
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("drop - does not swallow errors", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fail("Ouch"),
        Stream.concat(Stream.make(1)),
        Stream.drop(1),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "Ouch")
    }))

  it.effect("dropRight - simple example", () =>
    Effect.gen(function*() {
      const n = 2
      const stream = Stream.make(1, 2, 3, 4, 5)
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.dropRight(n), Stream.runCollect),
        result2: pipe(stream, Stream.runCollect, Effect.map(Chunk.dropRight(n)))
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("dropRight - does not swallow errors", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1),
        Stream.concat(Stream.fail("Ouch")),
        Stream.dropRight(1),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "Ouch")
    }))

  it.effect("dropUntil", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const f = (n: number) => n < 3
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.dropUntil(f), Stream.runCollect),
        result2: pipe(
          Stream.runCollect(stream),
          Effect.map((chunk) => pipe(chunk, Chunk.dropWhile((n) => !f(n)), Chunk.drop(1)))
        )
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("dropWhile", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const f = (n: number) => n < 3
      const { result1, result2 } = yield* (Effect.all({
        result1: pipe(stream, Stream.dropWhile(f), Stream.runCollect),
        result2: pipe(stream, Stream.runCollect, Effect.map(Chunk.dropWhile(f)))
      }))
      deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("dropWhile - short circuits", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1),
        Stream.concat(Stream.fail("Ouch")),
        Stream.take(1),
        Stream.dropWhile(constTrue),
        Stream.runDrain,
        Effect.either
      )
      assertRight(result, void 0)
    }))
})
