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
    it("error in sync effect", async () => {
      const program = Effect.attempt(() => {
        throw ExampleError
      }).fold(Option.some, Option.emptyOf)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(ExampleError))
    })

    it("attempt . fail", async () => {
      const io1 = ExampleErrorFail.either()
      const io2 = Effect.suspendSucceed(
        Effect.suspendSucceed(ExampleErrorFail).either()
      )
      const program = io1.zip(io2)

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      assert.isTrue(first == Either.left(ExampleError))
      assert.isTrue(second == Either.left(ExampleError))
    })

    it("deep attempt sync effect error", async () => {
      const program = deepErrorEffect(100).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(ExampleError))
    })

    it("deep attempt fail error", async () => {
      const program = deepErrorFail(100).either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(ExampleError))
    })

    it("attempt . sandbox . terminate", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      }).sandbox().either().map((either) => either.mapLeft((cause) => cause.untraced))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(Cause.die(ExampleError)))
    })

    it("fold . sandbox . terminate", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      })
        .sandbox()
        .fold((cause) => Option.some(cause.untraced), Option.emptyOf)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(Cause.die(ExampleError)))
    })

    it("catch sandbox terminate", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      }).sandbox().merge().map((cause) => cause.untraced)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Cause.die(ExampleError))
    })

    it("uncaught fail", async () => {
      const program = ExampleErrorFail.exit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Exit.fail(ExampleError))
    })

    it("uncaught sync effect error", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      })

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(ExampleError))
    })

    it("deep uncaught sync effect error", async () => {
      const program = deepErrorEffect(100).exit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Exit.fail(ExampleError))
    })

    it("catch failing finalizers with fail", async () => {
      const program = Effect.fail(ExampleError)
        .ensuring(
          Effect.succeed(() => {
            throw InterruptCause1
          })
        )
        .ensuring(
          Effect.succeed(() => {
            throw InterruptCause2
          })
        )
        .ensuring(
          Effect.succeed(() => {
            throw InterruptCause3
          })
        )
        .exit()
        .map((exit) => exit.mapErrorCause((cause) => cause.untraced))

      const expectedCause = Cause.fail(ExampleError) +
        Cause.die(InterruptCause1) +
        Cause.die(InterruptCause2) +
        Cause.die(InterruptCause3)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Exit.failCause(expectedCause))
    })

    it("catch failing finalizers with terminate", async () => {
      const program = Effect.die(ExampleError)
        .ensuring(
          Effect.succeed(() => {
            throw InterruptCause1
          })
        )
        .ensuring(
          Effect.succeed(() => {
            throw InterruptCause2
          })
        )
        .ensuring(
          Effect.succeed(() => {
            throw InterruptCause3
          })
        )
        .exit()
        .map((exit) => exit.mapErrorCause((cause) => cause.untraced))

      const expectedCause = Cause.die(ExampleError) +
        Cause.die(InterruptCause1) +
        Cause.die(InterruptCause2) +
        Cause.die(InterruptCause3)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Exit.failCause(expectedCause))
    })

    it("run preserves interruption status", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred }) => (deferred.succeed(undefined) > Effect.never).fork())
        .tap(({ deferred }) => deferred.await())
        .flatMap(({ fiber }) => fiber.interrupt().mapErrorCause((cause) => cause.untraced))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
    })

    it("run swallows inner interruption", async () => {
      const program = Deferred.make<never, number>()
        .tap((deferred) => Effect.interrupt.exit() > deferred.succeed(42))
        .flatMap((deferred) => deferred.await())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("timeout a long computation", async () => {
      const program = (
        Effect.sleep((5).seconds) > Effect.succeed(true)
      ).timeoutFail(false, (10).millis)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(false))
    })

    it("timeout a long computation with a cause", async () => {
      const cause = Cause.die(new Error("boom"))
      const program = (Effect.sleep((5).seconds) > Effect.succeed(true))
        .timeoutFailCause(cause, (10).millis)
        .sandbox()
        .flip()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == cause)
    })

    it("timeout repetition of uninterruptible effect", async () => {
      const program = Effect.unit.uninterruptible().forever().timeout((10).millis)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.none)
    })

    it("timeout in uninterruptible region", async () => {
      const program = Effect.unit.timeout((20).seconds).uninterruptible()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(undefined))
    })

    it("catchAllCause", async () => {
      const program = (Effect.succeed(42) > Effect.fail("uh oh")).catchAllCause(
        Effect.succeedNow
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Cause.fail("uh oh"))
    })

    it("exception in promise does not kill fiber", async () => {
      const program = Effect.promise(() => {
        throw ExampleError
      })

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(ExampleError))
    })
  })
})
