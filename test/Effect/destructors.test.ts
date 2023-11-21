import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import { assert, describe } from "vitest"

const ExampleError = new Error("Oh noes!")

describe.concurrent("Effect", () => {
  it.effect("head - on non empty list", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed([1, 2, 3]), Effect.head, Effect.either)
      assert.deepStrictEqual(result, Either.right(1))
    }))
  it.effect("head - on empty list", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed([] as ReadonlyArray<number>), Effect.head, Effect.either)
      assert.deepStrictEqual(result, Either.left(Option.none()))
    }))
  it.effect("head - on failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.fail("fail"), Effect.head, Effect.either)
      assert.deepStrictEqual(result, Either.left(Option.some("fail")))
    }))
  it.effect("isFailure - returns true when the effect is a failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isFailure(Effect.fail("fail")))
      assert.isTrue(result)
    }))
  it.effect("isFailure - returns false when the effect is a success", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isFailure(Effect.succeed("succeed")))
      assert.isFalse(result)
    }))
  it.effect("isSuccess - returns false when the effect is a failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isSuccess(Effect.fail("fail")))
      assert.isFalse(result)
    }))
  it.effect("isSuccess - returns true when the effect is a success", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.isSuccess(Effect.succeed("succeed")))
      assert.isTrue(result)
    }))
  it.effect("none - on Some fails with None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.none(Effect.succeed(Option.some(1)))))
      assert.deepStrictEqual(result, Exit.fail(Option.none()))
    }))
  it.effect("none - on None succeeds with undefined", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.none(Effect.succeed(Option.none())))
      assert.isUndefined(result)
    }))
  it.effect("none - fails with Some(ex) when effect fails with ex", () =>
    Effect.gen(function*($) {
      const error = new Cause.RuntimeException("failed task")
      const result = yield* $(Effect.exit(Effect.none(Effect.fail(error))))
      assert.deepStrictEqual(result, Exit.fail(Option.some(error)))
    }))
  it.effect("option - return success in Some", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.option(Effect.succeed(11)))
      assert.deepStrictEqual(result, Option.some(11))
    }))
  it.effect("option - return failure as None", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.option(Effect.fail(123)))
      assert.deepStrictEqual(result, Option.none())
    }))
  it.effect("option - not catch throwable", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.exit(Effect.option(Effect.die(ExampleError))))
      assert.deepStrictEqual(result, Exit.die(ExampleError))
    }))
  it.effect("option - catch throwable after sandboxing", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.option(Effect.sandbox(Effect.die(ExampleError))))
      assert.deepStrictEqual(result, Option.none())
    }))
})
