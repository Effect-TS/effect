import { ExampleError } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("isFailure", () => {
    it("returns true when the effect is a failure", async () => {
      const program = Effect.failSync("fail").isFailure

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("returns false when the effect is a success", async () => {
      const program = Effect.sync("succeed").isFailure

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })
  })

  describe.concurrent("isSuccess", () => {
    it("returns false when the effect is a failure", async () => {
      const program = Effect.failSync("fail").isSuccess

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })

    it("returns true when the effect is a success", async () => {
      const program = Effect.sync("succeed").isSuccess

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })

  describe.concurrent("left", () => {
    it("on Left value", async () => {
      const program = Effect.sync(Either.left("left")).left

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "left")
    })

    it("on Right value", async () => {
      const program = Effect.sync(Either.right("right")).left

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Either.right("right")))
    })

    it("on failure", async () => {
      const program = Effect.failSync("fail").left

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Either.left("fail")))
    })
  })

  describe.concurrent("right", () => {
    it("on Right value", async () => {
      const program = Effect.sync(Either.right("right")).right

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "right")
    })

    it("on Left value", async () => {
      const program = Effect.sync(Either.left("left")).right

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Either.left("left")))
    })

    it("on failure", async () => {
      const program = Effect.failSync("fail").right

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Either.right("fail")))
    })
  })

  describe.concurrent("some", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.sync(Maybe.some(1)).some

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("fails on None", async () => {
      const program = Effect.sync(Maybe.none).some

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Maybe.none))
    })

    it("fails when given an exception", async () => {
      const error = new RuntimeError("failed")
      const program = Effect.failSync(error).some

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Maybe.some(error)))
    })
  })

  describe.concurrent("none", () => {
    it("on Some fails with None", async () => {
      const program = Effect.sync(Maybe.some(1)).none

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Maybe.none))
    })

    it("on None succeeds with undefined", async () => {
      const program = Effect.sync(Maybe.none).none

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("fails with Some(ex) when effect fails with ex", async () => {
      const error = new RuntimeError("failed task")
      const program = Effect.failSync(error).none

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Maybe.some(error)))
    })
  })

  describe.concurrent("noneOrFail", () => {
    it("on None succeeds with Unit", async () => {
      const program = Effect.noneOrFail(Maybe.none)

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("on Some fails", async () => {
      const program = Effect.noneOrFail(Maybe.some("some")).catchAll(Effect.succeed)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "some")
    })
  })

  describe.concurrent("noneOrFailWith", () => {
    it("on None succeeds with Unit", async () => {
      const program = Effect.noneOrFailWith(Maybe.none, identity)

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("on Some fails", async () => {
      const program = Effect.noneOrFailWith(Maybe.some("some"), (s) => s + s).catchAll(
        Effect.succeed
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "somesome")
    })
  })

  describe.concurrent("someOrElse", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.sync(Maybe.some(1)).someOrElse(42)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("falls back to the default value if None", async () => {
      const program = Effect.sync(Maybe.none).someOrElse(42)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("does not change failed state", async () => {
      const program = Effect.failSync(ExampleError).someOrElse(42)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(ExampleError))
    })
  })

  describe.concurrent("someOrElseEffect", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.sync(Maybe.some(1)).someOrElseEffect(
        Effect.sync(42)
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("falls back to the default effect if None", async () => {
      const program = Effect.sync(Maybe.none).someOrElseEffect(Effect.sync(42))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("does not change failed state", async () => {
      const program = Effect.failSync(ExampleError).someOrElseEffect(Effect.sync(42))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(ExampleError))
    })
  })

  describe.concurrent("someOrFail", () => {
    it("extracts the optional value", async () => {
      const program = Effect.sync(Maybe.some(42)).someOrFail(ExampleError)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("fails when given a None", async () => {
      const program = Effect.sync(Maybe.none).someOrFail(ExampleError)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(ExampleError))
    })
  })

  describe.concurrent("getOrFailDiscard", () => {
    it("basic option test", async () => {
      const program = Effect.getOrFailDiscard(Maybe.some("foo"))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "foo")
    })

    it("side effect unit in option test", async () => {
      const program = Effect.getOrFailDiscard(Maybe.none).catchAll(() =>
        Effect.sync("controlling unit side-effect")
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "controlling unit side-effect")
    })
  })

  describe.concurrent("option", () => {
    it("return success in Some", async () => {
      const program = Effect.sync(11).option

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(11))
    })

    it("return failure as None", async () => {
      const program = Effect.failSync(123).option

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("not catch throwable", async () => {
      const program = Effect.die(ExampleError).option

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(ExampleError))
    })

    it("catch throwable after sandboxing", async () => {
      const program = Effect.die(ExampleError).sandbox.option

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })

  describe.concurrent("unsome", () => {
    it("fails when given Some error", async () => {
      const program = Effect.failSync(Maybe.some("error")).unsome

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail("error"))
    })

    it("succeeds with None given None error", async () => {
      const program = Effect.failSync(Maybe.none).unsome

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("succeeds with Some given a value", async () => {
      const program = Effect.sync(1).unsome

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })
  })

  describe.concurrent("getOrFail", () => {
    it("make a task from a defined option", async () => {
      const program = Effect.getOrFail(Maybe.some(1))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("make a task from an empty option", async () => {
      const program = Effect.getOrFail(Maybe.none)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() && result.cause.isFailType() &&
          result.cause.value instanceof NoSuchElement
      )
    })
  })

  describe.concurrent("someOrFailException", () => {
    it("extracts the optional value", async () => {
      const program = Effect.some(42).someOrFailException

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("fails when given a None", async () => {
      const program = Effect.sync(Maybe.none).someOrFailException

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() && result.cause.isFailType() &&
          result.cause.value instanceof NoSuchElement
      )
    })
  })

  describe.concurrent("unleft", () => {
    it("should handle successes with right", async () => {
      const effect = Effect.sync(Either.right(42))
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft.exit)
        .bind("expected", () => effect.exit)

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("should handle successes with left", async () => {
      const effect = Effect.sync(Either.left(42))
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft.exit)
        .bind("expected", () => effect.exit)

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("should handle failures", async () => {
      const effect = Effect.failSync(42)
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft.exit)
        .bind("expected", () => effect.exit)

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })

  describe.concurrent("unright", () => {
    it("should handle successes with right", async () => {
      const effect = Effect.sync(Either.right(42))
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright.exit)
        .bind("expected", () => effect.exit)

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("should handle successes with left", async () => {
      const effect = Effect.sync(Either.left(42))
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright.exit)
        .bind("expected", () => effect.exit)

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("should handle failures", async () => {
      const effect = Effect.failSync(42)
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright.exit)
        .bind("expected", () => effect.exit)

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })
})
