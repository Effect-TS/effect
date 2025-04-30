import { describe, it } from "@effect/vitest"
import {
  assertFailure,
  assertFalse,
  assertLeft,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  strictEqual
} from "@effect/vitest/utils"
import { Cause, Effect, Option, pipe } from "effect"

const ExampleError = new Error("Oh noes!")

describe("Effect", () => {
  it.effect("head - on non empty list", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed([1, 2, 3]), Effect.head, Effect.either)
      assertRight(result, 1)
    }))
  it.effect("head - on empty list", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed([] as ReadonlyArray<number>), Effect.head, Effect.option)
      assertNone(result)
    }))
  it.effect("head - on failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.fail("fail"), Effect.head, Effect.either)
      assertLeft(result, "fail")
    }))
  it.effect("isFailure - returns true when the effect is a failure", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.isFailure(Effect.fail("fail")))
      assertTrue(result)
    }))
  it.effect("isFailure - returns false when the effect is a success", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.isFailure(Effect.succeed("succeed")))
      assertFalse(result)
    }))
  it.effect("isSuccess - returns false when the effect is a failure", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.isSuccess(Effect.fail("fail")))
      assertFalse(result)
    }))
  it.effect("isSuccess - returns true when the effect is a success", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.isSuccess(Effect.succeed("succeed")))
      assertTrue(result)
    }))
  it.effect("none - on Some fails with NoSuchElementException", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.exit(Effect.none(Effect.succeed(Option.some(1)))))
      assertFailure(result, Cause.fail(new Cause.NoSuchElementException()))
    }))
  it.effect("none - on None succeeds with undefined", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.none(Effect.succeed(Option.none())))
      strictEqual(result, undefined)
    }))
  it.effect("none - fails with ex when effect fails with ex", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("failed task")
      const result = yield* (Effect.exit(Effect.none(Effect.fail(error))))
      assertFailure(result, Cause.fail(error))
    }))
  it.effect("option - return success in Some", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.option(Effect.succeed(11)))
      assertSome(result, 11)
    }))
  it.effect("option - return failure as None", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.option(Effect.fail(123)))
      assertNone(result)
    }))
  it.effect("option - not catch throwable", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.exit(Effect.option(Effect.die(ExampleError))))
      assertFailure(result, Cause.die(ExampleError))
    }))
  it.effect("option - catch throwable after sandboxing", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.option(Effect.sandbox(Effect.die(ExampleError))))
      assertNone(result)
    }))
})
