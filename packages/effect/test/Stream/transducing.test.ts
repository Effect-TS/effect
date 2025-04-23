import { describe, it } from "@effect/vitest"
import { assertLeft, deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { constTrue, pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("transduce - simple example", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("1", "2", ",", "3", "4"),
        Stream.transduce(
          pipe(
            Sink.collectAllWhile((char: string) => Number.isInteger(Number.parseInt(char))),
            Sink.zipLeft(Sink.collectAllWhile((char: string) => !Number.isInteger(Number.parseInt(char))))
          )
        ),
        Stream.map(Chunk.join("")),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), ["12", "34"])
    }))

  it.effect("transduce - no remainder", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3, 4),
        Stream.transduce(Sink.fold(100, (n) => n % 2 === 0, (acc, n) => acc + n)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [101, 105, 104])
    }))

  it.effect("transduce - with a sink that always signals more", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.transduce(Sink.fold(0, constTrue, (acc, n) => acc + n)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [6])
    }))

  it.effect("transduce - propagates scope error", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.transduce(Sink.fail("Woops")),
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, "Woops")
    }))
})
