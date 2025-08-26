import { describe, it } from "@effect/vitest"
import { assertLeft, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as fc from "effect/FastCheck"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { constFalse, constTrue, identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import { causesArb } from "../utils/cause.js"

const ExampleError = new Error("Oh noes!")

export const InterruptError1 = new Error("Oh noes 1!")
export const InterruptError2 = new Error("Oh noes 2!")
export const InterruptError3 = new Error("Oh noes 3!")

const ExampleErrorFail: Effect.Effect<never, Error, never> = Effect.fail(ExampleError)

const deepErrorEffect = (n: number): Effect.Effect<void, Cause.UnknownException> => {
  if (n === 0) {
    return Effect.try(() => {
      throw ExampleError
    })
  }
  return pipe(Effect.void, Effect.zipRight(deepErrorEffect(n - 1)))
}

const deepErrorFail = (n: number): Effect.Effect<never, Error> => {
  if (n === 0) {
    return Effect.fail(ExampleError)
  }
  return pipe(Effect.void, Effect.zipRight(deepErrorFail(n - 1)))
}

describe("Effect", () => {
  it.effect("attempt - error in sync effect", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.try(() => {
          throw ExampleError
        }),
        Effect.flip
      )
      deepStrictEqual(result.error, ExampleError)
    }))
  it.effect("attempt - fail", () =>
    Effect.gen(function*() {
      const io1 = Effect.either(ExampleErrorFail)
      const io2 = Effect.suspend(() => Effect.either(Effect.suspend(() => ExampleErrorFail)))
      const [first, second] = yield* pipe(io1, Effect.zip(io2))
      assertLeft(first, ExampleError)
      assertLeft(second, ExampleError)
    }))
  it.effect("attempt - deep attempt sync effect error", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.flip(deepErrorEffect(100)))
      deepStrictEqual(result.error, ExampleError)
    }))
  it.effect("attempt - deep attempt fail error", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.either(deepErrorFail(100)))
      assertLeft(result, ExampleError)
    }))
  it.effect("attempt - sandbox -> terminate", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.sandbox,
        Effect.either
      )
      assertLeft(result, Cause.die(ExampleError))
    }))
  it.effect("catch - sandbox terminate", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.sandbox,
        Effect.merge
      )
      deepStrictEqual(result, Cause.die(ExampleError))
    }))
  it.effect("catch failing finalizers with fail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.fail(ExampleError),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError1
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError2
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError3
        })),
        Effect.exit
      )
      const expected = Cause.sequential(
        Cause.sequential(
          Cause.sequential(Cause.fail(ExampleError), Cause.die(InterruptError1)),
          Cause.die(InterruptError2)
        ),
        Cause.die(InterruptError3)
      )
      deepStrictEqual(result, Exit.failCause(expected))
    }))
  it.effect("catch failing finalizers with terminate", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.die(ExampleError),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError1
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError2
        })),
        Effect.ensuring(Effect.sync(() => {
          throw InterruptError3
        })),
        Effect.exit
      )
      const expected = Cause.sequential(
        Cause.sequential(
          Cause.sequential(Cause.die(ExampleError), Cause.die(InterruptError1)),
          Cause.die(InterruptError2)
        ),
        Cause.die(InterruptError3)
      )
      deepStrictEqual(result, Exit.failCause(expected))
    }))
  it.effect("catchAllCause", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(Effect.succeed(42), Effect.zipRight(Effect.fail("uh oh")), Effect.catchAllCause(Effect.succeed))
      )
      deepStrictEqual(result, Cause.fail("uh oh"))
    }))
  it.effect("catchAllDefect - recovers from all defects", () =>
    Effect.gen(function*() {
      const message = "division by zero"
      const result = yield* pipe(
        Effect.die(new Cause.IllegalArgumentException(message)),
        Effect.catchAllDefect((e) => Effect.succeed((e as Error).message))
      )
      strictEqual(result, message)
    }))
  it.effect("catchAllDefect - leaves errors", () =>
    Effect.gen(function*() {
      const error = new Cause.IllegalArgumentException("division by zero")
      const result = yield* (
        pipe(Effect.fail(error), Effect.catchAllDefect((e) => Effect.succeed((e as Error).message)), Effect.exit)
      )
      deepStrictEqual(result, Exit.fail(error))
    }))
  it.effect("catchAllDefect - leaves values", () =>
    Effect.gen(function*() {
      const error = new Cause.IllegalArgumentException("division by zero")
      const result = yield* (
        pipe(Effect.succeed(error), Effect.catchAllDefect((e) => Effect.succeed((e as Error).message)))
      )
      deepStrictEqual(result, error)
    }))
  it.effect("catchSomeDefect - recovers from some defects", () =>
    Effect.gen(function*() {
      const message = "division by zero"
      const result = yield* pipe(
        Effect.die(new Cause.IllegalArgumentException(message)),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none()
        )
      )
      strictEqual(result, message)
    }))
  it.effect("catchSomeDefect - leaves the rest", () =>
    Effect.gen(function*() {
      const error = new Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.die(error),
        Effect.catchSomeDefect((e) =>
          Cause.isRuntimeException(e) ?
            Option.some(Effect.succeed(e.message)) :
            Option.none()
        ),
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))
  it.effect("catchSomeDefect - leaves errors", () =>
    Effect.gen(function*() {
      const error = new Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.fail(error),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none()
        ),
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))
  it.effect("catchSomeDefect - leaves values", () =>
    Effect.gen(function*() {
      const error = new Cause.IllegalArgumentException("division by zero")
      const result = yield* pipe(
        Effect.succeed(error),
        Effect.catchSomeDefect((e) =>
          Cause.isIllegalArgumentException(e)
            ? Option.some(Effect.succeed(e.message))
            : Option.none()
        )
      )
      deepStrictEqual(result, error)
    }))
  it.effect("catch - recovers from one of several tagged errors", () =>
    Effect.gen(function*() {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorA" })
      const result = yield* (Effect.catch(effect, "_tag", {
        failure: "ErrorA",
        onFailure: Effect.succeed
      }))
      deepStrictEqual(result, { _tag: "ErrorA" })
    }))
  it.effect("catch - does not recover from one of several tagged errors", () =>
    Effect.gen(function*() {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorB" })
      const result = yield* pipe(
        Effect.catch(effect, "_tag", {
          failure: "ErrorA",
          onFailure: Effect.succeed
        }),
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail({ _tag: "ErrorB" as const }))
    }))
  it.effect("catchIf - does not recover from one of several tagged errors", () =>
    Effect.gen(function*() {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorB" })
      const result = yield* pipe(
        Effect.catchIf(effect, (e): e is ErrorA => e._tag === "ErrorA", Effect.succeed),
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail({ _tag: "ErrorB" as const }))
    }))
  it.effect("catchTags - recovers from one of several tagged errors", () =>
    Effect.gen(function*() {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorA" })
      const result = yield* (Effect.catchTags(effect, {
        ErrorA: (e) => Effect.succeed(e)
      }))
      deepStrictEqual(result, { _tag: "ErrorA" })
    }))
  it.effect("catchTags - does not recover from one of several tagged errors", () =>
    Effect.gen(function*() {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorB" })
      const result = yield* (Effect.exit(
        Effect.catchTags(effect, {
          ErrorA: (e) => Effect.succeed(e)
        })
      ))
      deepStrictEqual(result, Exit.fail<ErrorB>({ _tag: "ErrorB" }))
    }))
  it.effect("catchTags - recovers from all tagged errors", () =>
    Effect.gen(function*() {
      interface ErrorA {
        readonly _tag: "ErrorA"
      }
      interface ErrorB {
        readonly _tag: "ErrorB"
      }
      const effect: Effect.Effect<never, ErrorA | ErrorB, never> = Effect.fail({ _tag: "ErrorB" })
      const result = yield* (Effect.catchTags(effect, {
        ErrorA: (e) => Effect.succeed(e),
        ErrorB: (e) => Effect.succeed(e)
      }))
      deepStrictEqual(result, { _tag: "ErrorB" })
    }))
  it.effect("fold - sandbox -> terminate", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.sandbox,
        Effect.match({
          onFailure: Option.some,
          onSuccess: () => Option.none() as Option.Option<Cause.Cause<never>>
        })
      )
      deepStrictEqual(result, Option.some(Cause.die(ExampleError)))
    }))
  it.effect("ignore - return success as unit", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.ignore(Effect.succeed(11)))
      strictEqual(result, undefined)
    }))
  it.effect("ignore - return failure as unit", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.ignore(Effect.fail(123)))
      strictEqual(result, undefined)
    }))
  it.effect("ignore - not catch throwable", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.exit(Effect.ignore(Effect.die(ExampleError))))
      deepStrictEqual(result, Exit.die(ExampleError))
    }))
  it.effect("orElse - does not recover from defects", () =>
    Effect.gen(function*() {
      const error = new Error("died")
      const fiberId = FiberId.make(0, 123)
      const bothCause = Cause.parallel(Cause.interrupt(fiberId), Cause.die(error))
      const thenCause = Cause.sequential(Cause.interrupt(fiberId), Cause.die(error))
      const plain = yield* pipe(Effect.die(error), Effect.orElse(() => Effect.void), Effect.exit)
      const both = yield* pipe(Effect.failCause(bothCause), Effect.orElse(() => Effect.void), Effect.exit)
      const then = yield* pipe(Effect.failCause(thenCause), Effect.orElse(() => Effect.void), Effect.exit)
      const fail = yield* pipe(Effect.fail(error), Effect.orElse(() => Effect.void), Effect.exit)
      deepStrictEqual(plain, Exit.die(error))
      deepStrictEqual(both, Exit.die(error))
      deepStrictEqual(then, Exit.die(error))
      deepStrictEqual(fail, Exit.succeed(void 0))
    }))
  it.effect("orElse - left failed and right died with kept cause", () =>
    Effect.gen(function*() {
      const z1 = Effect.fail(new Cause.RuntimeException("1"))
      const z2 = Effect.die(new Cause.RuntimeException("2"))
      const result = yield* pipe(
        z1,
        Effect.orElse(() => z2),
        Effect.catchAllCause((cause) => {
          if (Cause.isDie(cause)) {
            const defects = Cause.defects(cause)
            if (Chunk.isNonEmpty(defects)) {
              const head = Chunk.headNonEmpty(defects)
              return Effect.succeed((head as Cause.RuntimeException).message === "2")
            }
          }
          return Effect.succeed(false)
        })
      )
      assertTrue(result)
    }))
  it.effect("orElse - left failed and right failed with kept cause", () =>
    Effect.gen(function*() {
      const z1 = Effect.fail(new Cause.RuntimeException("1"))
      const z2 = Effect.fail(new Cause.RuntimeException("2"))
      const result = yield* pipe(
        z1,
        Effect.orElse(() => z2),
        Effect.catchAllCause((cause) => {
          if (Cause.isFailure(cause)) {
            const failures = Cause.failures(cause)
            if (Chunk.isNonEmpty(failures)) {
              const head = Chunk.headNonEmpty(failures)
              return Effect.succeed(head.message === "2")
            }
          }
          return Effect.succeed(false)
        })
      )
      assertTrue(result)
    }))
  it("orElse - is associative", async () => {
    const smallInts = fc.integer({ min: 0, max: 100 })
    const causes = causesArb(1, smallInts, fc.string())
    const successes = smallInts.map(Effect.succeed)
    const exits = fc.oneof(
      causes.map((s): Either.Either<Effect.Effect<number>, Cause.Cause<number>> => Either.left(s)),
      successes.map((s): Either.Either<Effect.Effect<number>, Cause.Cause<number>> => Either.right(s))
    ).map(Either.match({
      onLeft: Exit.failCause,
      onRight: Exit.succeed
    }))
    await fc.assert(fc.asyncProperty(exits, exits, exits, async (exit1, exit2, exit3) => {
      const leftEffect = pipe(exit1, Effect.orElse(() => exit2), Effect.orElse(() => exit3))
      const rightEffect = pipe(exit1, Effect.orElse(() => pipe(exit2, Effect.orElse(() => exit3))))
      const program = Effect.gen(function*() {
        const left = yield* (Effect.exit(leftEffect))
        const right = yield* (Effect.exit(rightEffect))
        return { left, right }
      })
      const { left, right } = await Effect.runPromise(program)
      deepStrictEqual(left, right)
    }))
  })
  it.effect("orElseFail - executes this effect and returns its value if it succeeds", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed(true), Effect.orElseFail(constFalse))
      assertTrue(result)
    }))
  it.effect("orElseFail - otherwise fails with the specified error", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.fail(false), Effect.orElseFail(constTrue), Effect.flip)
      assertTrue(result)
    }))
  it.effect("orElseSucceed - executes this effect and returns its value if it succeeds", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed(true), Effect.orElseSucceed(constFalse))
      assertTrue(result)
    }))
  it.effect("orElseSucceed - otherwise succeeds with the specified value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.fail(false), Effect.orElseSucceed(constTrue))
      assertTrue(result)
    }))
  it.effect("parallelErrors - one failure", () =>
    Effect.gen(function*() {
      const fiber1 = yield* (Effect.fork(Effect.fail("error1")))
      const fiber2 = yield* (Effect.fork(Effect.succeed("success1")))
      const result = yield* pipe(fiber1, Fiber.zip(fiber2), Fiber.join, Effect.parallelErrors, Effect.flip)
      deepStrictEqual(Array.from(result), ["error1"])
    }))
  it.effect("parallelErrors - all failures", () =>
    Effect.gen(function*() {
      const fiber1 = yield* (Effect.fork(Effect.fail("error1")))
      const fiber2 = yield* (Effect.fork(Effect.fail("error2")))
      const result = yield* pipe(fiber1, Fiber.zip(fiber2), Fiber.join, Effect.parallelErrors, Effect.flip)
      deepStrictEqual(Array.from(result), ["error1", "error2"])
    }))
  it.effect("promise - exception does not kill fiber", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.promise(() => {
          throw ExampleError
        }),
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(ExampleError))
    }))
  it.effect("try = handles exceptions", () =>
    Effect.gen(function*() {
      const message = "hello"
      const result = yield* pipe(
        Effect.try({
          try: () => {
            throw message
          },
          catch: identity
        }),
        Effect.exit
      )

      deepStrictEqual(result, Exit.fail(message))
    }))
  it.effect("uncaught - fail", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.exit(ExampleErrorFail))
      deepStrictEqual(result, Exit.fail(ExampleError))
    }))
  it.effect("uncaught - sync effect error", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.sync(() => {
          throw ExampleError
        }),
        Effect.exit
      )

      deepStrictEqual(result, Exit.die(ExampleError))
    }))
  it.effect("uncaught - deep sync effect error", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.flip(deepErrorEffect(100)))
      deepStrictEqual(result.error, ExampleError)
    }))
  it.effect("unwraps exception", () =>
    Effect.gen(function*() {
      const failure = Effect.fail(Cause.fail(new Error("fail")))
      const success = Effect.succeed(100)
      const message = yield* pipe(
        failure,
        Effect.unsandbox,
        Effect.matchEffect({
          onFailure: (e) => Effect.succeed(e.message),
          onSuccess: () => Effect.succeed("unexpected")
        })
      )
      const result = yield* (Effect.unsandbox(success))
      strictEqual(message, "fail")
      strictEqual(result, 100)
    }))
  it.effect("no information is lost during composition", () =>
    Effect.gen(function*() {
      const cause = <R, E>(effect: Effect.Effect<never, E, R>): Effect.Effect<Cause.Cause<E>, never, R> => {
        return Effect.cause(effect)
      }
      const expectedCause = Cause.fail("oh no")
      const result = yield* (cause(pipe(Effect.failCause(expectedCause), Effect.sandbox, Effect.unsandbox)))
      deepStrictEqual(result, expectedCause)
    }))
})
