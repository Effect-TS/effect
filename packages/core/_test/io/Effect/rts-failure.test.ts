import {
  deepErrorEffect,
  deepErrorFail,
  ExampleError,
  ExampleErrorFail,
  InterruptCause1,
  InterruptCause2,
  InterruptCause3
} from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS failure", () => {
    it("error in sync effect", () =>
      Do(($) => {
        const result = $(
          Effect.attempt(() => {
            throw ExampleError
          }).fold(Maybe.some, Maybe.empty)
        )
        assert.isTrue(result == Maybe.some(ExampleError))
      }).unsafeRunPromise())

    it("attempt . fail", () =>
      Do(($) => {
        const io1 = ExampleErrorFail.either
        const io2 = Effect.suspendSucceed(
          Effect.suspendSucceed(ExampleErrorFail).either
        )
        const result = $(io1.zip(io2))
        const { tuple: [first, second] } = result
        assert.isTrue(first == Either.left(ExampleError))
        assert.isTrue(second == Either.left(ExampleError))
      }).unsafeRunPromise())

    it("deep attempt sync effect error", () =>
      Do(($) => {
        const result = $(deepErrorEffect(100).either)
        assert.isTrue(result == Either.left(ExampleError))
      }).unsafeRunPromise())

    it("deep attempt fail error", () =>
      Do(($) => {
        const result = $(deepErrorFail(100).either)
        assert.isTrue(result == Either.left(ExampleError))
      }).unsafeRunPromise())

    it("attempt . sandbox . terminate", () =>
      Do(($) => {
        const result = $(
          Effect.sync(() => {
            throw ExampleError
          }).sandbox.either
        )
        assert.isTrue(result == Either.left(Cause.die(ExampleError)))
      }).unsafeRunPromise())

    it("fold . sandbox . terminate", () =>
      Do(($) => {
        const result = $(
          Effect.sync(() => {
            throw ExampleError
          }).sandbox.fold((cause) => Maybe.some(cause), Maybe.empty)
        )
        assert.isTrue(result == Maybe.some(Cause.die(ExampleError)))
      }).unsafeRunPromise())

    it("catch sandbox terminate", () =>
      Do(($) => {
        const result = $(
          Effect.sync(() => {
            throw ExampleError
          }).sandbox.merge
        )
        assert.isTrue(result == Cause.die(ExampleError))
      }).unsafeRunPromise())

    it("uncaught fail", () =>
      Do(($) => {
        const result = $(ExampleErrorFail.exit)
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromiseExit())

    it("uncaught sync effect error", () =>
      Do(($) => {
        const result = $(
          Effect.sync(() => {
            throw ExampleError
          }).exit
        )
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromise())

    it("deep uncaught sync effect error", () =>
      Do(($) => {
        const result = $(deepErrorEffect(100).exit)
        assert.isTrue(result == Exit.fail(ExampleError))
      }).unsafeRunPromise())

    it("catch failing finalizers with fail", () =>
      Do(($) => {
        const result = $(
          Effect.failSync(ExampleError)
            .ensuring(
              Effect.sync(() => {
                throw InterruptCause1
              })
            )
            .ensuring(
              Effect.sync(() => {
                throw InterruptCause2
              })
            )
            .ensuring(
              Effect.sync(() => {
                throw InterruptCause3
              })
            )
            .exit
        )
        const expected = Cause.fail(ExampleError) +
          Cause.die(InterruptCause1) +
          Cause.die(InterruptCause2) +
          Cause.die(InterruptCause3)
        assert.isTrue(result == Exit.failCause(expected))
      }).unsafeRunPromiseExit())

    it("catch failing finalizers with terminate", () =>
      Do(($) => {
        const result = $(
          Effect.dieSync(ExampleError)
            .ensuring(
              Effect.sync(() => {
                throw InterruptCause1
              })
            )
            .ensuring(
              Effect.sync(() => {
                throw InterruptCause2
              })
            )
            .ensuring(
              Effect.sync(() => {
                throw InterruptCause3
              })
            )
            .exit
        )
        const expected = Cause.die(ExampleError) +
          Cause.die(InterruptCause1) +
          Cause.die(InterruptCause2) +
          Cause.die(InterruptCause3)
        assert.isTrue(result == Exit.failCause(expected))
      }).unsafeRunPromiseExit())

    it("run preserves interruption status", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const fiber = $(deferred.succeed(undefined).zipRight(Effect.never).fork)
        $(deferred.await)
        const result = $(fiber.interrupt)
        assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
      }).unsafeRunPromise())

    it("run swallows inner interruption", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, number>())
        $(Effect.interrupt.exit.zipRight(deferred.succeed(42)))
        const result = $(deferred.await)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("timeout a long computation", () =>
      Do(($) => {
        const result = $(
          Effect.sleep((5).seconds).zipRight(Effect.sync(true)).timeoutFail(false, (10).millis).exit
        )
        assert.isTrue(result == Exit.fail(false))
      }).unsafeRunPromiseExit())

    it("timeout a long computation with a cause", () =>
      Do(($) => {
        const cause = Cause.die(new Error("boom"))
        const result = $(
          Effect.sleep((5).seconds)
            .zipRight(Effect.sync(true))
            .timeoutFailCause(cause, (10).millis)
            .sandbox
            .flip
        )
        assert.isTrue(result == cause)
      }).unsafeRunPromise())

    it("timeout repetition of uninterruptible effect", () =>
      Do(($) => {
        const result = $(Effect.unit.uninterruptible.forever.timeout((10).millis))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("timeout in uninterruptible region", () =>
      Do(($) => {
        const result = $(Effect.unit.timeout((20).seconds).uninterruptible)
        assert.isTrue(result == Maybe.some(undefined))
      }).unsafeRunPromise())

    it("catchAllCause", () =>
      Do(($) => {
        const result = $(
          Effect.sync(42)
            .zipRight(Effect.failSync("uh oh"))
            .catchAllCause(Effect.succeed)
        )
        assert.isTrue(result == Cause.fail("uh oh"))
      }).unsafeRunPromise())

    it("exception in promise does not kill fiber", () =>
      Do(($) => {
        const result = $(
          Effect.promise(() => {
            throw ExampleError
          }).exit
        )
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromiseExit())
  })
})
