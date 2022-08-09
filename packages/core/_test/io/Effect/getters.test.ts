import { ExampleError } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("isFailure", () => {
    it("returns true when the effect is a failure", () =>
      Do(($) => {
        const result = $(Effect.failSync("fail").isFailure)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("returns false when the effect is a success", () =>
      Do(($) => {
        const result = $(Effect.sync("succeed").isFailure)
        assert.isFalse(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("isSuccess", () => {
    it("returns false when the effect is a failure", () =>
      Do(($) => {
        const result = $(Effect.failSync("fail").isSuccess)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("returns true when the effect is a success", () =>
      Do(($) => {
        const result = $(Effect.sync("succeed").isSuccess)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("left", () => {
    it("on Left value", () =>
      Do(($) => {
        const result = $(Effect.sync(Either.left("left")).left)
        assert.strictEqual(result, "left")
      }).unsafeRunPromise())

    it("on Right value", () =>
      Do(($) => {
        const result = $(Effect.sync(Either.right("right")).left.exit)
        assert.isTrue(result == Exit.fail(Either.right("right")))
      }).unsafeRunPromiseExit())

    it("on failure", () =>
      Do(($) => {
        const result = $(Effect.failSync("fail").left.exit)
        assert.isTrue(result == Exit.fail(Either.left("fail")))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("right", () => {
    it("on Right value", () =>
      Do(($) => {
        const result = $(Effect.sync(Either.right("right")).right)
        assert.strictEqual(result, "right")
      }).unsafeRunPromise())

    it("on Left value", () =>
      Do(($) => {
        const result = $(Effect.sync(Either.left("left")).right.exit)
        assert.isTrue(result == Exit.fail(Either.left("left")))
      }).unsafeRunPromiseExit())

    it("on failure", () =>
      Do(($) => {
        const result = $(Effect.failSync("fail").right.exit)
        assert.isTrue(result == Exit.fail(Either.right("fail")))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("some", () => {
    it("extracts the value from Some", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.some(1)).some)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("fails on None", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.none).some.exit)
        assert.isTrue(result == Exit.fail(Maybe.none))
      }).unsafeRunPromiseExit())

    it("fails when given an exception", () =>
      Do(($) => {
        const error = new RuntimeError("failed")
        const result = $(Effect.failSync(error).some.exit)
        assert.isTrue(result == Exit.fail(Maybe.some(error)))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("none", () => {
    it("on Some fails with None", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.some(1)).none.exit)
        assert.isTrue(result == Exit.fail(Maybe.none))
      }).unsafeRunPromiseExit())

    it("on None succeeds with undefined", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.none).none)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("fails with Some(ex) when effect fails with ex", () =>
      Do(($) => {
        const error = new RuntimeError("failed task")
        const result = $(Effect.failSync(error).none.exit)
        assert.isTrue(result == Exit.fail(Maybe.some(error)))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("noneOrFail", () => {
    it("on None succeeds with Unit", () =>
      Do(($) => {
        const result = $(Effect.noneOrFail(Maybe.none))
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("on Some fails", () =>
      Do(($) => {
        const result = $(Effect.noneOrFail(Maybe.some("some")).catchAll(Effect.succeed))
        assert.strictEqual(result, "some")
      }).unsafeRunPromise())
  })

  describe.concurrent("noneOrFailWith", () => {
    it("on None succeeds with Unit", () =>
      Do(($) => {
        const result = $(Effect.noneOrFailWith(Maybe.none, identity))
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("on Some fails", () =>
      Do(($) => {
        const result = $(
          Effect.noneOrFailWith(Maybe.some("some"), (s) => s + s).catchAll(Effect.succeed)
        )
        assert.strictEqual(result, "somesome")
      }).unsafeRunPromise())
  })

  describe.concurrent("someOrElse", () => {
    it("extracts the value from Some", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.some(1)).someOrElse(42))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("falls back to the default value if None", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.none).someOrElse(42))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("does not change failed state", () =>
      Do(($) => {
        const result = $(Effect.failSync(ExampleError).someOrElse(42).exit)
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("someOrElseEffect", () => {
    it("extracts the value from Some", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.some(1)).someOrElseEffect(Effect.sync(42)))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("falls back to the default effect if None", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.none).someOrElseEffect(Effect.sync(42)))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("does not change failed state", () =>
      Do(($) => {
        const result = $(Effect.failSync(ExampleError).someOrElseEffect(Effect.sync(42)).exit)
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("someOrFail", () => {
    it("extracts the optional value", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.some(42)).someOrFail(ExampleError))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("fails when given a None", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.none).someOrFail(ExampleError).exit)
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("getOrFailDiscard", () => {
    it("basic option test", () =>
      Do(($) => {
        const result = $(Effect.getOrFailDiscard(Maybe.some("foo")))
        assert.strictEqual(result, "foo")
      }).unsafeRunPromise())

    it("side effect unit in option test", () =>
      Do(($) => {
        const result = $(
          Effect.getOrFailDiscard(Maybe.none).catchAll(() =>
            Effect.sync("controlling unit side-effect")
          )
        )
        assert.strictEqual(result, "controlling unit side-effect")
      }).unsafeRunPromise())
  })

  describe.concurrent("option", () => {
    it("return success in Some", () =>
      Do(($) => {
        const result = $(Effect.sync(11).option)
        assert.isTrue(result == Maybe.some(11))
      }).unsafeRunPromise())

    it("return failure as None", () =>
      Do(($) => {
        const result = $(Effect.failSync(123).option)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("not catch throwable", () =>
      Do(($) => {
        const result = $(Effect.dieSync(ExampleError).option.exit)
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromiseExit())

    it("catch throwable after sandboxing", () =>
      Do(($) => {
        const result = $(Effect.dieSync(ExampleError).sandbox.option)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })

  describe.concurrent("unsome", () => {
    it("fails when given Some error", () =>
      Do(($) => {
        const result = $(Effect.failSync(Maybe.some("error")).unsome.exit)
        assert.isTrue(result == Exit.fail("error"))
      }).unsafeRunPromiseExit())

    it("succeeds with None given None error", () =>
      Do(($) => {
        const result = $(Effect.failSync(Maybe.none).unsome)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("succeeds with Some given a value", () =>
      Do(($) => {
        const result = $(Effect.sync(1).unsome)
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())
  })

  describe.concurrent("getOrFail", () => {
    it("make a task from a defined option", () =>
      Do(($) => {
        const result = $(Effect.getOrFail(Maybe.some(1)))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("make a task from an empty option", () =>
      Do(($) => {
        const result = $(Effect.getOrFail(Maybe.none).exit)
        assert.isTrue(
          result.isFailure() && result.cause.isFailType() &&
            result.cause.value instanceof NoSuchElement
        )
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("someOrFailException", () => {
    it("extracts the optional value", () =>
      Do(($) => {
        const result = $(Effect.some(42).someOrFailException)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("fails when given a None", () =>
      Do(($) => {
        const result = $(Effect.sync(Maybe.none).someOrFailException.exit)
        assert.isTrue(
          result.isFailure() && result.cause.isFailType() &&
            result.cause.value instanceof NoSuchElement
        )
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("unleft", () => {
    it("should handle successes with right", () =>
      Do(($) => {
        const effect = Effect.succeed(Either.right(42))
        const result = $(effect.left.unleft.exit)
        const expected = $(effect.exit)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("should handle successes with left", () =>
      Do(($) => {
        const effect = Effect.succeed(Either.left(42))
        const result = $(effect.left.unleft.exit)
        const expected = $(effect.exit)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("should handle failures", () =>
      Do(($) => {
        const effect = Effect.fail(42)
        const result = $(effect.left.unleft.exit)
        const expected = $(effect.exit)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })

  describe.concurrent("unright", () => {
    it("should handle successes with right", () =>
      Do(($) => {
        const effect = Effect.succeed(Either.right(42))
        const result = $(effect.right.unright.exit)
        const expected = $(effect.exit)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("should handle successes with left", () =>
      Do(($) => {
        const effect = Effect.succeed(Either.left(42))
        const result = $(effect.right.unright.exit)
        const expected = $(effect.exit)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("should handle failures", () =>
      Do(($) => {
        const effect = Effect.fail(42)
        const result = $(effect.right.unright.exit)
        const expected = $(effect.exit)
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })
})
