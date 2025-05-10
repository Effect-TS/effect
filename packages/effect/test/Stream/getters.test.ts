import { describe, it } from "@effect/vitest"
import { assertLeft, deepStrictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("some", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.succeed(Option.some(1)),
        Stream.concat(Stream.succeed(Option.none())),
        Stream.some,
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, Option.none())
    }))

  it.effect("some", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.succeed(Option.some(1)),
        Stream.concat(Stream.succeed(Option.none())),
        Stream.someOrElse(() => -1),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, -1])
    }))

  it.effect("someOrFail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.succeed(Option.some(1)),
        Stream.concat(Stream.succeed(Option.none())),
        Stream.someOrFail(() => -1),
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, -1)
    }))
})
