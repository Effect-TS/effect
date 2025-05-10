import { describe, it } from "@effect/vitest"
import { assertLeft, assertRight, deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import * as Stream from "effect/Stream"
import { unify } from "effect/Unify"

describe("Stream.Foreign", () => {
  it.effect("Tag", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(
        tag,
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.provideService(tag, 10)
      )
      deepStrictEqual(result, [10])
    }))

  it.effect("Unify", () =>
    Effect.gen(function*() {
      const unifiedEffect = unify((yield* (Random.nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* (Random.nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* (Random.nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* (Random.nextInt)) > 1 ? Option.some(0) : Option.none())
      deepStrictEqual(Chunk.toReadonlyArray(yield* (Stream.runCollect(unifiedEffect))), [0])
      deepStrictEqual(Chunk.toReadonlyArray(yield* (Stream.runCollect(unifiedExit))), [0])
      deepStrictEqual(Chunk.toReadonlyArray(yield* (Stream.runCollect(unifiedEither))), [0])
      deepStrictEqual(Chunk.toReadonlyArray(yield* (Stream.runCollect(unifiedOption))), [0])
    }))

  it.effect("Either.right", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")

      const result = yield* pipe(
        Either.right(10),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.provideService(tag, 10)
      )
      deepStrictEqual(result, [10])
    }))

  it.effect("Either.left", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(
        Either.left(10),
        Stream.runCollect,
        Effect.either,
        Effect.provideService(tag, 10)
      )
      assertLeft(result, 10)
    }))

  it.effect("Option.some", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(
        Option.some(10),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.provideService(tag, 10)
      )
      deepStrictEqual(result, [10])
    }))

  it.effect("Option.none", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(
        Option.none(),
        Stream.runCollect,
        Effect.either,
        Effect.provideService(tag, 10)
      )
      assertLeft(result, new Cause.NoSuchElementException())
    }))

  it.effect("Effect.fail", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(
        Effect.fail("ok"),
        Stream.runCollect,
        Effect.either,
        Effect.provideService(tag, 10)
      )
      assertLeft(result, "ok")
    }))

  it.effect("Effect.succeed", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(
        Effect.succeed("ok"),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.either,
        Effect.provideService(tag, 10)
      )
      assertRight(result, ["ok"])
    }))
})
