import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Cause } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import {
  deepErrorEffect,
  deepErrorFail,
  ExampleError,
  ExampleErrorFail,
  InterruptCause1,
  InterruptCause2,
  InterruptCause3
} from "./test-utils"

describe("Effect", () => {
  describe("RTS failure", () => {
    it("error in sync effect", async () => {
      const program = Effect.attempt(() => {
        throw ExampleError
      }).fold(Option.some, Option.emptyOf)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(ExampleError))
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

      expect(first).toEqual(Either.left(ExampleError))
      expect(second).toEqual(Either.left(ExampleError))
    })

    it("deep attempt sync effect error", async () => {
      const program = deepErrorEffect(100).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(ExampleError))
    })

    it("deep attempt fail error", async () => {
      const program = deepErrorFail(100).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(ExampleError))
    })

    it("attempt . sandbox . terminate", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      })
        .sandbox()
        .either()
        .map((either) => either.mapLeft((cause) => cause.untraced()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Cause.die(ExampleError)))
    })

    it("fold . sandbox . terminate", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      })
        .sandbox()
        .fold((cause) => Option.some(cause.untraced()), Option.emptyOf)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(Cause.die(ExampleError)))
    })

    it("catch sandbox terminate", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      })
        .sandbox()
        .merge()
        .map((cause) => cause.untraced())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Cause.die(ExampleError))
    })

    it("uncaught fail", async () => {
      const program = ExampleErrorFail.exit()

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("uncaught sync effect error", async () => {
      const program = Effect.succeed(() => {
        throw ExampleError
      })

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("deep uncaught sync effect error", async () => {
      const program = deepErrorEffect(100).exit()

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
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
        .map((exit) => exit.mapErrorCause((cause) => cause.untraced()))

      const expectedCause =
        Cause.fail(ExampleError) +
        Cause.die(InterruptCause1) +
        Cause.die(InterruptCause2) +
        Cause.die(InterruptCause3)

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Exit.failCause(expectedCause))
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
        .map((exit) => exit.mapErrorCause((cause) => cause.untraced()))

      const expectedCause =
        Cause.die(ExampleError) +
        Cause.die(InterruptCause1) +
        Cause.die(InterruptCause2) +
        Cause.die(InterruptCause3)

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Exit.failCause(expectedCause))
    })

    it("run preserves interruption status", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          (promise.succeed(undefined) > Effect.never).fork()
        )
        .tap(({ promise }) => promise.await())
        .flatMap(({ fiber }) =>
          fiber.interrupt().mapErrorCause((cause) => cause.untraced())
        )

      const result = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.isInterruptedOnly()).toBe(true)
    })

    it("run swallows inner interruption", async () => {
      const program = Promise.make<never, number>()
        .tap((promise) => Effect.interrupt.exit() > promise.succeed(42))
        .flatMap((promise) => promise.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("timeout a long computation", async () => {
      const program = (
        Effect.sleep(Duration.fromSeconds(5)) > Effect.succeed(true)
      ).timeoutFail(false, Duration(10))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(false))
    })

    it("timeout a long computation with a cause", async () => {
      const cause = Cause.die(new Error("boom"))
      const program = (Effect.sleep(Duration.fromSeconds(5)) > Effect.succeed(true))
        .timeoutFailCause(cause, Duration(10))
        .sandbox()
        .flip()

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(cause)
    })

    // FIXED: replaced Promise.resolve with setTimeout in Scheduler
    it("timeout repetition of uninterruptible effect", async () => {
      const program = Effect.unit.uninterruptible().forever().timeout(Duration(10))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("timeout in uninterruptible region", async () => {
      const program = Effect.unit.timeout(Duration.fromSeconds(20)).uninterruptible()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(undefined))
    })

    it("catchAllCause", async () => {
      const program = (Effect.succeed(42) > Effect.fail("uh oh")).catchAllCause(
        Effect.succeedNow
      )

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(Cause.fail("uh oh"))
    })

    it("exception in promise does not kill fiber", async () => {
      const program = Effect.promise(() => {
        throw ExampleError
      })

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })
  })
})
