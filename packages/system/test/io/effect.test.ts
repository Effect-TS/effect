import { List } from "../../src/collection/immutable/List"
import { Either } from "../../src/data/Either"
import { constFalse, constTrue, identity } from "../../src/data/Function"
import { Option } from "../../src/data/Option"
import { IllegalArgumentException, RuntimeError } from "../../src/io/Cause"
import type { UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { FiberId } from "../../src/io/FiberId"
import { Queue } from "../../src/io/Queue"
import * as Ref from "../../src/io/Ref"
import * as Equal from "../../src/prelude/Equal"

const ExampleError = new Error("Oh noes!")
// const InterruptCause1 = new Error("Oh noes 1!")
// const InterruptCause2 = new Error("Oh noes 2!")
// const InterruptCause3 = new Error("Oh noes 3!")

const ExampleErrorFail = Effect.fail(ExampleError)
const ExampleErrorDie = Effect.die(() => {
  throw ExampleError
})

function exactlyOnce<R, A, A1>(
  value: A,
  f: (_: UIO<A>) => Effect<R, string, A1>
): Effect<R, string, A1> {
  return Ref.make(0).flatMap((ref) =>
    Effect.Do()
      .bind("res", () => f(Ref.update_(ref, (n) => n + 1) > Effect.succeed(value)))
      .bind("count", () => Ref.get(ref))
      .tap(({ count }) =>
        count !== 1 ? Effect.fail("Accessed more than once") : Effect.unit
      )
      .map(({ res }) => res)
  )
}

describe("Effect", () => {
  describe("absolve", () => {
    it("fluent/static method consistency", async () => {
      const ioEither = Effect.succeed(Either.right("test"))
      const program = Effect.Do()
        .bind("abs1", () => ioEither.absolve())
        .bind("abs2", () => Effect.absolve(ioEither))

      const { abs1, abs2 } = await program.unsafeRunPromise()

      expect(abs1).toEqual("test")
      expect(abs2).toEqual("test")
    })
  })

  describe("absorbWith", () => {
    it("on fail", async () => {
      const program = ExampleErrorFail.absorbWith(identity)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("on die", async () => {
      const program = ExampleErrorDie.absorbWith(identity)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("on success", async () => {
      const program = Effect.succeed(1).absorbWith(() => ExampleError)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("acquireRelease", () => {
    it("acquireRelease happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireRelease(
            Effect.succeed(42),
            Effect.succeed(0),
            Ref.set_(release, true)
          )
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("acquireReleaseWith happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseWith(
            Effect.succeed(42),
            (n) => Effect.succeed(n + 1),
            () => Ref.set_(release, true)
          )
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(43)
      expect(released).toBe(true)
    })

    it("acquireReleaseExitWith happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => Ref.set_(release, true)
          )
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("acquireReleaseExitWith error handling", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("exit", () =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.fail("use failed"),
            () => Effect.die(releaseDied)
          ).exit()
        )
        .flatMap(({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.succeed(cause),
            () => Effect.fail("effect should have failed")
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result.failures()).toEqual(List("use failed"))
      expect(result.defects()).toEqual(List(releaseDied))
    })
  })

  describe("acquireRelease + disconnect", () => {
    it("acquireRelease happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireRelease(
            Effect.succeed(42),
            Effect.succeed(0),
            Ref.set_(release, true)
          ).disconnect()
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("acquireReleaseWith happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseWith(
            Effect.succeed(42),
            (n) => Effect.succeed(n + 1),
            () => Ref.set_(release, true)
          ).disconnect()
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(43)
      expect(released).toBe(true)
    })

    it("acquireReleaseExitWith happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => Ref.set_(release, true)
          ).disconnect()
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { released, result } = await program.unsafeRunPromise()

      expect(result).toBe(0)
      expect(released).toBe(true)
    })

    it("acquireReleaseExitWith error handling", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("exit", () =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => Effect.fail("use failed"),
            () => Effect.die(releaseDied)
          )
            .disconnect()
            .exit()
        )
        .flatMap(({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.succeed(cause),
            () => Effect.fail("effect should have failed")
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result.failures()).toEqual(List("use failed"))
      expect(result.defects()).toEqual(List(releaseDied))
    })

    it("acquireReleaseExitWith beast mode error handling", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("exit", ({ release }) =>
          Effect.acquireReleaseExitWith(
            Effect.succeed(42),
            () => {
              throw releaseDied
            },
            () => Ref.set_(release, true)
          )
            .disconnect()
            .exit()
        )
        .bind("cause", ({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.succeed(cause),
            () => Effect.fail("effect should have failed")
          )
        )
        .bind("released", ({ release }) => Ref.get(release))

      const { cause, released } = await program.unsafeRunPromise()

      expect(cause.defects()).toEqual(List(releaseDied))
      expect(released).toBe(true)
    })
  })

  // TODO: enable after porting TestClock
  // describe("cached", () => {
  // it("returns new instances after duration", async () => {
  //   function incrementAndGet(ref: Ref.Ref<number>): UIO<number> {
  //     return Ref.updateAndGet_(ref, (n) => n + 1)
  //   }
  //
  //   const program = Effect.Do()
  //     .bind("ref", () => Ref.make(0))
  //     .bind("cache", ({ ref }) =>
  //       incrementAndGet(ref).cached(Duration.fromMinutes(60))
  //     )
  //     .bind("a", ({ cache }) => cache)
  //     .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
  //     .bind("b", ({ cache }) => cache)
  //     .tap(() => TestClock.adjust(Duration.fromMinutes(1)))
  //     .bind("c", ({ cache }) => cache)
  //     .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
  //     .bind("d", ({ cache }) => cache)
  //
  //   const { a, b, c, d } = await program.unsafeRunPromise()
  //
  //   expect(a).toStrictEqual(b)
  //   expect(b).not.toStrictEqual(c)
  //   expect(c).toStrictEqual(d)
  // })
  //
  //   it("correctly handles an infinite duration time to live", async () => {
  //     const program = Effect.Do()
  //       .bind("ref", () => Ref.make(0))
  //       .bindValue("getAndIncrement", ({ ref }) =>
  //         Ref.modify_(ref, (n) => Tuple(n, n + 1))
  //       )
  //       .bind("cached", ({ getAndIncrement }) =>
  //         getAndIncrement.cached(Duration.Infinity)
  //       )
  //       .bind("a", ({ cached }) => cached)
  //       .bind("b", ({ cached }) => cached)
  //       .bind("c", ({ cached }) => cached)
  //
  //     const { a, b, c } = await program.unsafeRunPromise()
  //
  //     expect(a).toBe(0)
  //     expect(b).toBe(0)
  //     expect(c).toBe(0)
  //   })
  // })

  // TODO: enable after porting TestClock
  // describe("cachedInvalidate", () => {
  //   it("returns new instances after duration", async () => {
  //     function incrementAndGet(ref: Ref.Ref<number>): UIO<number> {
  //       return Ref.updateAndGet_(ref, (n) => n + 1)
  //     }
  //
  //     const program = Effect.Do()
  //       .bind("ref", () => Ref.make(0))
  //       .bind("tuple", ({ ref }) =>
  //         incrementAndGet(ref).cachedInvalidate(Duration.fromMinutes(60))
  //       )
  //       .bindValue("cached", ({ tuple }) => tuple.get(0))
  //       .bindValue("invalidate", ({ tuple }) => tuple.get(1))
  //       .bind("a", ({ cached }) => cached)
  //       .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
  //       .bind("b", ({ cached }) => cached)
  //       .tap(({ invalidate }) => invalidate)
  //       .bind("c", ({ cached }) => cached)
  //       .tap(() => TestClock.adjust(Duration.fromMinutes(1)))
  //       .bind("d", ({ cached }) => cached)
  //       .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
  //       .bind("e", ({ cached }) => cached)
  //
  //     const { a, b, c, d } = await program.unsafeRunPromise()
  //
  //     expect(a).toStrictEqual(b)
  //     expect(b).not.toStrictEqual(c)
  //     expect(c).toStrictEqual(d)
  //     expect(d).not.toStrictEqual(e)
  //   })
  // })

  describe("catchNonFatalOrDie", () => {
    it("recovers from non-fatal", async () => {
      const message = "division by zero"
      const program = Effect.fail(
        new IllegalArgumentException(message)
      ).catchNonFatalOrDie((e) => Effect.succeed(e.message))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.succeed(message))
    })
  })

  describe("catchAllDefect", () => {
    it("recovers from all defects", async () => {
      const message = "division by zero"
      const program = Effect.die(new IllegalArgumentException(message)).catchAllDefect(
        (e) => Effect.succeed((e as Error).message)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(message)
    })

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.fail(error).catchAllDefect((e) =>
        Effect.succeed((e as Error).message)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.succeed(error).catchAllDefect((e) =>
        Effect.succeed((e as Error).message)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(error)
    })
  })

  describe("catchSomeDefect", () => {
    it("recovers from some defects", async () => {
      const message = "division by zero"
      const program = Effect.die(new IllegalArgumentException(message)).catchSomeDefect(
        (e) =>
          e instanceof IllegalArgumentException
            ? Option.some(Effect.succeed(e.message))
            : Option.none
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(message)
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.die(error).catchSomeDefect((e) =>
        e instanceof RuntimeError ? Option.some(Effect.succeed(e.message)) : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.fail(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Option.some(Effect.succeed(e.message))
          : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.succeed(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Option.some(Effect.succeed(e.message))
          : Option.none
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(error)
    })
  })

  describe("continueOrFail", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.continueOrFail("value was not 0", (v) =>
              v === 0 ? Option.some(v) : Option.none
            )
          )
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.continueOrFail("value was not 0", (v) =>
              v === 0 ? Option.some(v) : Option.none
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("value was not 0")))
    })
  })

  describe("continueOrFailEffect", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.continueOrFailEffect("value was not 0", (v) =>
              v === 0 ? Option.some(Effect.succeed(v)) : Option.none
            )
          )
            .sandbox()
            .either()
        )
        .bind("partialBadCase", () =>
          exactlyOnce(0, (_) =>
            _.continueOrFailEffect("predicate failed!", (n) =>
              n === 0 ? Option.some(Effect.fail("partial failed!")) : Option.none
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.continueOrFailEffect("value was not 0", (v) =>
              v === 0 ? Option.some(Effect.succeed(v)) : Option.none
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase, partialBadCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(partialBadCase).toEqual(Either.left(Either.left("partial failed!")))
      expect(badCase).toEqual(Either.left(Either.left("value was not 0")))
    })
  })

  describe("collectAllPar", () => {
    it("returns the list in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.collectAllPar(list).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("is referentially transparent", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bindValue("op", ({ counter }) => Ref.getAndUpdate_(counter, (n) => n + 1))
        .bindValue("ops3", ({ op }) =>
          Effect.collectAllPar(List(op, op, op)).map((chunk) => chunk.toArray())
        )
        .bindValue("ops6", ({ ops3 }) => ops3.zipPar(ops3))
        .flatMap(({ ops6 }) => ops6)

      const result = await program.unsafeRunPromise()

      expect(result.get(0)).not.toStrictEqual(result.get(1))
    })
  })

  describe("collectAllPar - parallelism", () => {
    it("returns results in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.collectAllPar(list)
        .withParallelism(2)
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })
  })

  describe("collectAllParDiscard - parallelism", () => {
    it("preserves failures", async () => {
      const list = List.repeat(Effect.fail(new RuntimeError()), 10)
      const program = Effect.collectAllParDiscard(list).withParallelism(5).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(new RuntimeError())
    })
  })

  describe("collectFirst", () => {
    it("collects the first value for which the effectual function returns Some", async () => {
      const program = Effect.collectFirst(List.range(0, 10), (n) =>
        n > 5 ? Effect.succeed(Option.some(n)) : Effect.succeed(Option.none)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(6))
    })
  })

  describe("done", () => {
    it("check that done lifts exit result into IO", async () => {
      const fiberId = FiberId(0, 213)
      const error = ExampleError
      const program = Effect.Do()
        .bind("completed", () => Effect.done(Exit.succeed(1)))
        .bind("interrupted", () => Effect.done(Exit.interrupt(fiberId)).exit())
        .bind("terminated", () => Effect.done(Exit.die(error)).exit())
        .bind("failed", () => Effect.done(Exit.fail(error)).exit())

      const { completed, failed, interrupted, terminated } =
        await program.unsafeRunPromise()

      expect(completed).toBe(1)
      expect(interrupted.untraced()).toEqual(Exit.interrupt(fiberId))
      expect(terminated.untraced()).toEqual(Exit.die(error))
      expect(failed.untraced()).toEqual(Exit.fail(error))
    })
  })

  describe("flatten", () => {
    it("fluent/static method consistency", async () => {
      const effect = Effect.succeed(Effect.succeed("test"))
      const program = Effect.Do()
        .bind("flatten1", () => effect.flatten())
        .bind("flatten2", () => Effect.flatten(effect))

      const { flatten1, flatten2 } = await program.unsafeRunPromise()

      expect(flatten1).toEqual("test")
      expect(flatten2).toEqual("test")
    })
  })

  describe("repeatUntil", () => {
    it("repeatUntil repeats until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (
            Ref.updateAndGet_(input, (n) => n - 1) < Ref.update_(output, (n) => n + 1)
          ).repeatUntil((n) => n === 0)
        )
        .flatMap(({ output }) => Ref.get(output))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("repeatUntil always evaluates effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) => Ref.update_(ref, (n) => n + 1).repeatUntil(constTrue))
        .flatMap(Ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(1)
    })
  })

  describe("repeatUntilEquals", () => {
    it("repeatUntilEquals repeats until result is equal to predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take() < Ref.update_(acc, (n) => n + 1)).repeatUntilEquals(
            Equal.number
          )(5)
        )
        .flatMap(({ acc }) => Ref.get(acc))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("repeatUntilEffect", () => {
    it("repeats until the effectful condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (
            Ref.updateAndGet_(input, (n) => n - 1) < Ref.update_(output, (n) => n + 1)
          ).repeatUntilEffect((n) => Effect.succeed(n === 0))
        )
        .flatMap(({ output }) => Ref.get(output))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Ref.update_(ref, (n) => n + 1).repeatUntilEffect(() => Effect.succeed(true))
        )
        .flatMap(Ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("repeatWhile", () => {
    it("repeats while the condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (
            Ref.updateAndGet_(input, (n) => n - 1) < Ref.update_(output, (n) => n + 1)
          ).repeatWhile((n) => n >= 0)
        )
        .flatMap(({ output }) => Ref.get(output))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) => Ref.update_(ref, (n) => n + 1).repeatWhile(constFalse))
        .flatMap(Ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("repeatWhileEquals", () => {
    it("repeats while the result equals the predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take() < Ref.update_(acc, (n) => n + 1)).repeatWhileEquals(
            Equal.number
          )(0)
        )
        .flatMap(({ acc }) => Ref.get(acc))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })
})
