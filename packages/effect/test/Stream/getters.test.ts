import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import { deepStrictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Stream", () => {
  it.effect("some", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.succeed(Option.some(1)),
        Stream.concat(Stream.succeed(Option.none())),
        Stream.some,
        Stream.runCollect,
        Effect.either
      )
      deepStrictEqual(result, Either.left(Option.none()))
    }))

  it.effect("some", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.succeed(Option.some(1)),
        Stream.concat(Stream.succeed(Option.none())),
        Stream.someOrElse(() => -1),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, -1])
    }))

  it.effect("someOrFail", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.succeed(Option.some(1)),
        Stream.concat(Stream.succeed(Option.none())),
        Stream.someOrFail(() => -1),
        Stream.runCollect,
        Effect.either
      )
      deepStrictEqual(result, Either.left(-1))
    }))
})
