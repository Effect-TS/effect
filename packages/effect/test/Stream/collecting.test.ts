import { describe, it } from "@effect/vitest"
import { assertLeft, assertRight, deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("collect", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Either.left(1), Either.right(2), Either.left(3)),
        Stream.filterMap((either) =>
          Either.isRight(either) ?
            Option.some(either.right) :
            Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [2])
    }))

  it.effect("collectEffect - simple example", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Either.left(1), Either.right(2), Either.left(3)),
        Stream.filterMapEffect((either) =>
          Either.isRight(either) ?
            Option.some(Effect.succeed(either.right * 2)) :
            Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [4])
    }))

  it.effect("collectEffect - multiple chunks", () =>
    Effect.gen(function*() {
      const chunks = Chunk.make(
        Chunk.make(Either.left(1), Either.right(2)),
        Chunk.make(Either.right(3), Either.left(4))
      )
      const result = yield* pipe(
        Stream.fromChunks(...chunks),
        Stream.filterMapEffect((either) =>
          Either.isRight(either) ?
            Option.some(Effect.succeed(either.right * 10)) :
            Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [20, 30])
    }))

  it.effect("collectEffect - handles failures", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Either.left(1), Either.right(2), Either.left(3)),
        Stream.filterMapEffect(() => Option.some(Effect.fail("Ouch"))),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "Ouch")
    }))

  it.effect("collectEffect - laziness on chunks", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.filterMapEffect((n) =>
          n === 3 ?
            Option.some(Effect.fail("boom")) :
            Option.some(Effect.succeed(n))
        ),
        Stream.either,
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result),
        [Either.right(1), Either.right(2), Either.left("boom")]
      )
    }))

  it.effect("collectWhile - simple example", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Option.some(1), Option.some(2), Option.none(), Option.some(4)),
        Stream.filterMapWhile(identity),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 2])
    }))

  it.effect("collectWhile - short circuits", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Option.some(1)),
        Stream.concat(Stream.fail("Ouch")),
        Stream.filterMapWhile((option) => Option.isNone(option) ? Option.some(1) : Option.none()),
        Stream.runDrain,
        Effect.either
      )
      assertRight(result, void 0)
    }))

  it.effect("collectWhileEffect - simple example", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Option.some(1), Option.some(2), Option.none(), Option.some(4)),
        Stream.filterMapWhileEffect((option) =>
          Option.isSome(option) ?
            Option.some(Effect.succeed(option.value * 2)) :
            Option.none()
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [2, 4])
    }))

  it.effect("collectWhileEffect - short circuits", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Option.some(1)),
        Stream.concat(Stream.fail("Ouch")),
        Stream.filterMapWhileEffect((option) =>
          Option.isNone(option) ?
            Option.some(Effect.succeed(1)) :
            Option.none()
        ),
        Stream.runDrain,
        Effect.either
      )
      assertRight(result, void 0)
    }))

  it.effect("collectWhileEffect - fails", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(Option.some(1), Option.some(2), Option.none(), Option.some(3)),
        Stream.filterMapWhileEffect(() => Option.some(Effect.fail("Ouch"))),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "Ouch")
    }))

  it.effect("collectWhileEffect - laziness on chunks", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3, 4),
        Stream.filterMapWhileEffect((n) =>
          n === 3 ?
            Option.some(Effect.fail("boom")) :
            Option.some(Effect.succeed(n))
        ),
        Stream.either,
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result),
        [Either.right(1), Either.right(2), Either.left("boom")]
      )
    }))
})
