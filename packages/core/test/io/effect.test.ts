import * as os from "os"

import { Chunk } from "../../src/collection/immutable/Chunk"
import { List } from "../../src/collection/immutable/List"
import { Tuple } from "../../src/collection/immutable/Tuple"
import { Duration } from "../../src/data/Duration"
import { Either } from "../../src/data/Either"
import { constFalse, constTrue, constVoid, identity } from "../../src/data/Function"
import { NoSuchElementException } from "../../src/data/GlobalExceptions"
import type { Has } from "../../src/data/Has"
import { tag } from "../../src/data/Has"
import { Option } from "../../src/data/Option"
import { Cause, IllegalArgumentException, RuntimeError } from "../../src/io/Cause"
import { Clock, HasClock, LiveClock } from "../../src/io/Clock"
import type { IO, RIO, UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { Fiber } from "../../src/io/Fiber"
import { FiberId } from "../../src/io/FiberId"
import { InterruptStatus } from "../../src/io/InterruptStatus"
import { Layer } from "../../src/io/Layer"
import { Promise } from "../../src/io/Promise"
import { Queue } from "../../src/io/Queue"
import type { HasRandom } from "../../src/io/Random"
import * as Random from "../../src/io/Random"
import { Ref } from "../../src/io/Ref"
import { Schedule } from "../../src/io/Schedule"
import { TraceElement } from "../../src/io/TraceElement"
import * as Equal from "../../src/prelude/Equal"
import { AtomicNumber } from "../../src/support/AtomicNumber"
import { withLatch, withLatchAwait } from "../test-utils/Latch"

const ExampleError = new Error("Oh noes!")
const InterruptCause1 = new Error("Oh noes 1!")
const InterruptCause2 = new Error("Oh noes 2!")
const InterruptCause3 = new Error("Oh noes 3!")

const ExampleErrorFail = Effect.fail(ExampleError)
const ExampleErrorDie = Effect.die(() => {
  throw ExampleError
})

function asyncExampleError<A>(): IO<unknown, A> {
  return Effect.async((cb) => {
    cb(Effect.fail(ExampleError))
  })
}

function asyncUnit<E>(): IO<E, void> {
  return Effect.async((cb) => {
    cb(Effect.unit)
  })
}

function exactlyOnce<R, A, A1>(
  value: A,
  f: (_: UIO<A>) => Effect<R, string, A1>
): Effect<R, string, A1> {
  return Ref.make(0).flatMap((ref) =>
    Effect.Do()
      .bind("res", () => f(ref.update((n) => n + 1) > Effect.succeed(value)))
      .bind("count", () => ref.get())
      .tap(({ count }) =>
        count !== 1 ? Effect.fail("Accessed more than once") : Effect.unit
      )
      .map(({ res }) => res)
  )
}

function sum(n: number): number {
  if (n < 0) {
    return 0
  }
  return n + sum(n - 1)
}

function fib(n: number): number {
  if (n <= 1) {
    return n
  }
  return fib(n - 1) + fib(n - 2)
}

function concurrentFib(n: number): UIO<number> {
  if (n <= 1) {
    return Effect.succeed(n)
  }
  return Effect.Do()
    .bind("fiber1", () => concurrentFib(n - 1).fork())
    .bind("fiber2", () => concurrentFib(n - 2).fork())
    .bind("v1", ({ fiber1 }) => fiber1.join())
    .bind("v2", ({ fiber2 }) => fiber2.join())
    .map(({ v1, v2 }) => v1 + v2)
}

function deepMapEffect(n: number): UIO<number> {
  function loop(n: number, acc: UIO<number>): UIO<number> {
    if (n <= 0) {
      return acc
    }
    return Effect.suspendSucceed(
      loop(
        n - 1,
        acc.map((n) => n + 1)
      )
    )
  }
  return loop(n, Effect.succeed(0))
}

function deepErrorEffect(n: number): IO<unknown, void> {
  if (n === 0) {
    return Effect.attempt(() => {
      throw ExampleError
    })
  }
  return Effect.unit > deepErrorEffect(n - 1)
}

function deepErrorFail(n: number): IO<unknown, void> {
  if (n === 0) {
    return Effect.fail(ExampleError)
  }
  return Effect.unit > deepErrorFail(n - 1)
}

const NumberServiceId = Symbol.for("@effect-ts/core/test/NumberService")

interface NumberService {
  readonly n: number
}

const NumberService = tag<NumberService>(NumberServiceId)

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
            release.set(true)
          )
        )
        .bind("released", ({ release }) => release.get())

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
            () => release.set(true)
          )
        )
        .bind("released", ({ release }) => release.get())

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
            () => release.set(true)
          )
        )
        .bind("released", ({ release }) => release.get())

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
            release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get())

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
            () => release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get())

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
            () => release.set(true)
          ).disconnect()
        )
        .bind("released", ({ release }) => release.get())

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
            () => release.set(true)
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
        .bind("released", ({ release }) => release.get())

      const { cause, released } = await program.unsafeRunPromise()

      expect(cause.defects()).toEqual(List(releaseDied))
      expect(released).toBe(true)
    })
  })

  // TODO: enable after porting TestClock
  describe("cached", () => {
    it.skip("returns new instances after duration", async () => {
      // function incrementAndGet(ref: Ref.Ref<number>): UIO<number> {
      //   return Ref.updateAndGet_(ref, (n) => n + 1)
      // }
      // const program = Effect.Do()
      //   .bind("ref", () => Ref.make(0))
      //   .bind("cache", ({ ref }) =>
      //     incrementAndGet(ref).cached(Duration.fromMinutes(60))
      //   )
      //   .bind("a", ({ cache }) => cache)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("b", ({ cache }) => cache)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(1)))
      //   .bind("c", ({ cache }) => cache)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("d", ({ cache }) => cache)
      // const { a, b, c, d } = await program.unsafeRunPromise()
      // expect(a).toStrictEqual(b)
      // expect(b).not.toStrictEqual(c)
      // expect(c).toStrictEqual(d)
    })

    it.skip("correctly handles an infinite duration time to live", async () => {
      // const program = Effect.Do()
      //   .bind("ref", () => Ref.make(0))
      //   .bindValue("getAndIncrement", ({ ref }) =>
      //     Ref.modify_(ref, (n) => Tuple(n, n + 1))
      //   )
      //   .bind("cached", ({ getAndIncrement }) =>
      //     getAndIncrement.cached(Duration.Infinity)
      //   )
      //   .bind("a", ({ cached }) => cached)
      //   .bind("b", ({ cached }) => cached)
      //   .bind("c", ({ cached }) => cached)
      // const { a, b, c } = await program.unsafeRunPromise()
      // expect(a).toBe(0)
      // expect(b).toBe(0)
      // expect(c).toBe(0)
    })
  })

  // TODO: enable after porting TestClock
  describe("cachedInvalidate", () => {
    it.skip("returns new instances after duration", async () => {
      // function incrementAndGet(ref: Ref.Ref<number>): UIO<number> {
      //   return Ref.updateAndGet_(ref, (n) => n + 1)
      // }
      // const program = Effect.Do()
      //   .bind("ref", () => Ref.make(0))
      //   .bind("tuple", ({ ref }) =>
      //     incrementAndGet(ref).cachedInvalidate(Duration.fromMinutes(60))
      //   )
      //   .bindValue("cached", ({ tuple }) => tuple.get(0))
      //   .bindValue("invalidate", ({ tuple }) => tuple.get(1))
      //   .bind("a", ({ cached }) => cached)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("b", ({ cached }) => cached)
      //   .tap(({ invalidate }) => invalidate)
      //   .bind("c", ({ cached }) => cached)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(1)))
      //   .bind("d", ({ cached }) => cached)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("e", ({ cached }) => cached)
      // const { a, b, c, d } = await program.unsafeRunPromise()
      // expect(a).toStrictEqual(b)
      // expect(b).not.toStrictEqual(c)
      // expect(c).toStrictEqual(d)
      // expect(d).not.toStrictEqual(e)
    })
  })

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
        .bindValue("op", ({ counter }) => counter.getAndUpdate((n) => n + 1))
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
      const fiberId = FiberId(0, 123, TraceElement.empty)
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
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).repeatUntil(
            (n) => n === 0
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("repeatUntil always evaluates effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) => ref.update((n) => n + 1).repeatUntil(constTrue))
        .flatMap((ref) => ref.get())

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
          (queue.take() < acc.update((n) => n + 1)).repeatUntilEquals(Equal.number)(5)
        )
        .flatMap(({ acc }) => acc.get())

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
            input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)
          ).repeatUntilEffect((n) => Effect.succeed(n === 0))
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).repeatUntilEffect(() => Effect.succeed(true))
        )
        .flatMap((ref) => ref.get())

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
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).repeatWhile(
            (n) => n >= 0
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("always evaluates the effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) => ref.update((n) => n + 1).repeatWhile(constFalse))
        .flatMap((ref) => ref.get())

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
          (queue.take() < acc.update((n) => n + 1)).repeatWhileEquals(Equal.number)(0)
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("repeatWhileEffect", () => {
    it("repeats while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (
            input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)
          ).repeatWhileEffect((v) => Effect.succeed(v >= 0))
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("always evaluates effect at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).repeatWhileEffect(() => Effect.succeed(false))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("eventually", () => {
    it("succeeds eventually", async () => {
      function effect(ref: Ref<number>) {
        return ref
          .get()
          .flatMap((n) =>
            n < 10 ? ref.update((n) => n + 1) > Effect.fail("Ouch") : Effect.succeed(n)
          )
      }

      const program = Ref.make(0).flatMap((ref) => effect(ref).eventually())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })

  describe("exists", () => {
    it("determines whether any element satisfies the effectual predicate", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.struct({
        result1: Effect.exists(list, (n) => Effect.succeed(n > 3)),
        result2: Effect.exists(list, (n) => Effect.succeed(n > 5))
      })

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(true)
      expect(result2).toBe(false)
    })
  })

  describe("filter", () => {
    it("filters a collection using an effectual predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("results", ({ ref }) =>
          Effect.filter(list, (n) =>
            ref.update((list) => list.prepend(n)).as(n % 2 === 0)
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get().map((list) => list.reverse().toArray()))

      const { effects, results } = await program.unsafeRunPromise()

      expect(results).toEqual([2, 4, 6, 6])
      expect(effects).toEqual([2, 4, 6, 3, 5, 6])
    })
  })

  describe("filterNot", () => {
    it("filters a collection using an effectual predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bind("results", ({ ref }) =>
          Effect.filterNot(list, (n) =>
            ref.update((list) => list.prepend(n)).as(n % 2 === 0)
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get().map((list) => list.reverse().toArray()))

      const { effects, results } = await program.unsafeRunPromise()

      expect(results).toEqual([3, 5])
      expect(effects).toEqual([2, 4, 6, 3, 5, 6])
    })
  })

  describe("filterPar", () => {
    it("filters a collection in parallel using an effectual predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28)
      const program = Effect.filterPar(list, (n) => Effect.succeed(n % 2 === 0)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([2, 4, 6, 6, 10, 20, 22, 28])
    })
  })

  describe("filterNotPar", () => {
    it("filters a collection in parallel using an effectual predicate, removing all elements that satisfy the predicate", async () => {
      const list = List(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28)
      const program = Effect.filterNotPar(list, (n) => Effect.succeed(n % 2 === 0)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([3, 5, 11, 15, 17, 23, 25])
    })
  })

  describe("filterOrElseWith", () => {
    it("returns checked failure from held value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            )
          )
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("1 was not 0")))
    })
  })

  describe("filterOrElse", () => {
    it("returns checked failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.filterOrElse((n) => n === 0, Effect.fail("predicate failed!"))
          )
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.filterOrElse((n) => n === 0, Effect.fail("predicate failed!"))
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("predicate failed!")))
    })
  })

  describe("filterOrFail", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) => _.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) => _.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("predicate failed!")))
    })
  })

  describe("flattenErrorOption", () => {
    it("fails when given Some error", async () => {
      const program = Effect.fail(Option.some("error")).flattenErrorOption("default")

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("fails with default when given None error", async () => {
      const program = Effect.fail(Option.none).flattenErrorOption("default")

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("default"))
    })

    it("succeeds when given a value", async () => {
      const program = Effect.succeed(1).flattenErrorOption("default")

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("reduce", () => {
    it("with a successful step function sums the list properly", async () => {
      const program = Effect.reduce(List(1, 2, 3, 4, 5), 0, (acc, curr) =>
        Effect.succeed(acc + curr)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(15)
    })

    it("with a failing step function returns a failed IO", async () => {
      const program = Effect.reduce(List(1, 2, 3, 4, 5), 0, () => Effect.fail("fail"))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })

    it("run sequentially from left to right", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.reduce(list, List.empty<number>(), (acc, curr) =>
        Effect.succeed(acc.prepend(curr))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.reverse())
    })
  })

  describe("reduceRight", () => {
    it("with a successful step function sums the list properly", async () => {
      const program = Effect.reduceRight(List(1, 2, 3, 4, 5), 0, (acc, curr) =>
        Effect.succeed(acc + curr)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(15)
    })

    it("with a failing step function returns a failed IO", async () => {
      const program = Effect.reduce(List(1, 2, 3, 4, 5), 0, () => Effect.fail("fail"))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })

    it("run sequentially from right to left", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.reduceRight(list, List.empty<number>(), (curr, acc) =>
        Effect.succeed(acc.prepend(curr))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })
  })

  describe("forAll", () => {
    it("determines whether all elements satisfy the effectual predicate", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.struct({
        result1: Effect.forAll(list, (n) => Effect.succeed(n > 3)),
        result2: Effect.forAll(list, (n) => Effect.succeed(n > 0))
      })

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(false)
      expect(result2).toBe(true)
    })
  })

  describe("forEach", () => {
    it("returns the list of results", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEach(list, (n) => Effect.succeed(n + 1)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([2, 3, 4, 5, 6, 7])
    })

    it("both evaluates effects and returns the list of results in the same order", async () => {
      const list = List("1", "2", "3")
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<string>()))
        .bind("result", ({ ref }) =>
          Effect.forEach(
            list,
            (s) =>
              ref.update((list) => list.append(s)) > Effect.succeed(Number.parseInt(s))
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get())

      const { effects, result } = await program.unsafeRunPromise()

      expect(effects).toEqual(list)
      expect(result).toEqual([1, 2, 3])
    })

    it("fails if one of the effects fails", async () => {
      const list = List("1", "h", "3")
      const program = Effect.forEach(list, (s) =>
        Effect.succeed(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw new IllegalArgumentException()
          }
          return n
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new IllegalArgumentException()))
    })
  })

  describe("forEachDiscard", () => {
    it("runs effects in order", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachDiscard(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })

    it("can be run twice", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("effect", ({ ref }) =>
          Effect.forEachDiscard(list, (n) => ref.update((_) => _ + n))
        )
        .tap(({ effect }) => effect)
        .tap(({ effect }) => effect)
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(30)
    })
  })

  describe("forEach for Option", () => {
    it("succeeds with None given None", async () => {
      const program = Effect.forEachOption(Option.emptyOf<string>(), (s) =>
        Effect.succeed(s.length)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("succeeds with Some given Some", async () => {
      const program = Effect.forEachOption(Option.some("success"), (s) =>
        Effect.succeed(s.length)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(7))
    })

    it("fails if the optional effect fails", async () => {
      const program = Effect.forEachOption(Option.some("help"), (s) =>
        Effect.succeed(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw new IllegalArgumentException()
          }
          return n
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new IllegalArgumentException()))
    })
  })

  describe("forEachPar", () => {
    it("runs single task", async () => {
      const program = Effect.forEachPar(List(2), (n) => Effect.succeed(n * 2)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([4])
    })

    it("runs two tasks", async () => {
      const program = Effect.forEachPar(List(2, 3), (n) => Effect.succeed(n * 2)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([4, 6])
    })

    it("runs many tasks", async () => {
      const list = List.range(1, 100)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n * 2)).map(
        (chunk) => chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.map((n) => n * 2).toArray())
    })

    it("runs a task that fails", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5 ? Effect.fail("boom") : Effect.succeed(n * 2)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("boom")
    })

    it("runs two failed tasks", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5
          ? Effect.fail("boom1")
          : n === 8
          ? Effect.fail("boom2")
          : Effect.succeed(n * 2)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(["boom1", "boom2"]).toContain(result)
    })

    it("runs a task that dies", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5 ? Effect.dieMessage("boom") : Effect.succeed(n * 2)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
    })

    it("runs a task that is interrupted", async () => {
      const program = Effect.forEachPar(List.range(1, 10), (n) =>
        n === 5 ? Effect.interrupt : Effect.succeed(n * 2)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.isInterrupted()).toBe(true)
    })

    it("runs a task that throws an unsuspended exception", async () => {
      const program = Effect.forEachPar(List(1), (n) =>
        Effect.succeed(() => {
          throw new Error(n.toString())
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new Error("1")))
    })

    it("returns results in the same order", async () => {
      const program = Effect.forEachPar(List("1", "2", "3"), (s) =>
        Effect.succeed(Number.parseInt(s))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("returns results in the same order for Chunk", async () => {
      const program = Effect.forEachPar(Chunk("1", "2", "3"), (s) =>
        Effect.succeed(Number.parseInt(s))
      ).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("runs effects in parallel", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.forEachPar(
            List(Effect.never, promise.succeed(undefined)),
            identity
          ).fork()
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("runs effects in parallel for Chunk", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.forEachPar(
            List(Effect.never, promise.succeed(undefined), Effect.never),
            identity
          ).fork()
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("propagates error", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEachPar(list, (n) =>
        n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("not odd")
    })

    it("interrupts effects on first failure", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise", () => Promise.make<never, void>())
        .bindValue("actions", ({ promise, ref }) =>
          List<Effect<unknown, string, number>>(
            Effect.never,
            Effect.succeed(1),
            Effect.fail("C"),
            (promise.await() > ref.set(true)).as(1)
          )
        )
        .bind("e", ({ actions }) => Effect.forEachPar(actions, identity).flip())
        .bind("v", ({ ref }) => ref.get())

      const { e, v } = await program.unsafeRunPromise()

      expect(e).toBe("C")
      expect(v).toBe(false)
    })

    it("does not kill fiber when forked on the parent scope", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("fibers", ({ ref }) =>
          Effect.forEachPar(List.range(1, 101), (n) => ref.update((_) => _ + 1).fork())
        )
        .tap(({ fibers }) => Effect.forEach(fibers, (fiber) => fiber.await()))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(100)
    })
  })

  describe("forEachPar - parallelism", () => {
    it("returns the list of results in the appropriate order", async () => {
      const list = List(1, 2, 3)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n.toString()))
        .withParallelism(2)
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["1", "2", "3"])
    })

    it("works on large lists", async () => {
      const n = 10
      const list = List.range(0, 100001)
      const program = Effect.forEachPar(list, (n) => Effect.succeed(n))
        .withParallelism(n)
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("runs effects in parallel", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.forEachPar(List(Effect.never, promise.succeed(undefined)), identity)
            .withParallelism(2)
            .fork()
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("propagates error", async () => {
      const list = List(1, 2, 3, 4, 5, 6)
      const program = Effect.forEachPar(list, (n) =>
        n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd")
      )
        .withParallelism(4)
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("not odd"))
    })

    it("interrupts effects on first failure", async () => {
      const actions = List<IO<string, number>>(
        Effect.never,
        Effect.succeed(1),
        Effect.fail("C")
      )
      const program = Effect.forEachPar(actions, identity).withParallelism(4).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("C"))
    })
  })

  describe("forEachParDiscard", () => {
    it("accumulates errors", async () => {
      function task(
        started: Ref<number>,
        trigger: Promise<never, void>,
        n: number
      ): IO<number, void> {
        return started
          .updateAndGet((n) => n + 1)
          .flatMap(
            (count) =>
              Effect.when(count === 3, trigger.succeed(undefined)) >
              trigger.await() >
              Effect.fail(n)
          )
      }

      const program = Effect.Do()
        .bind("started", () => Ref.make(0))
        .bind("trigger", () => Promise.make<never, void>())
        .flatMap(({ started, trigger }) =>
          Effect.forEachParDiscard(List.range(1, 4), (n) =>
            task(started, trigger, n).uninterruptible()
          ).foldCause(
            (cause) => cause.failures().toArray(),
            () => []
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("runs all effects", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachParDiscard(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })

    it("runs all effects for Chunk", async () => {
      const list = Chunk(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachParDiscard(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(list.toArray())
    })

    it("completes on empty input", async () => {
      const program = Effect.forEachParDiscard(List.empty(), () => Effect.unit).map(
        constTrue
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("forEachParDiscard - parallelism", () => {
    it("runs all effects", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.forEachParDiscard(list, (n) =>
            ref.update((list) => list.append(n))
          ).withParallelism(2)
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })
  })

  describe("forkAll", () => {
    it("returns the list of results in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.forkAll(list)
        .flatMap((fiber) => fiber.join())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("happy-path", async () => {
      const list = List.range(1, 1001)
      const program = Effect.forkAll(list.map((n) => Effect.succeed(n)))
        .flatMap((fiber) => fiber.join())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("empty input", async () => {
      const program = Effect.forkAll(List.empty<UIO<number>>())
        .flatMap((fiber) => fiber.join())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("propagate failures", async () => {
      const boom = new Error()
      const fail = Effect.fail(boom)
      const program = Effect.forkAll(List(fail)).flatMap((fiber) => fiber.join().flip())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("propagates defects", async () => {
      const boom = new Error("boom")
      const die = Effect.die(boom)

      function joinDefect(fiber: Fiber<never, unknown>) {
        return fiber.join().sandbox().flip()
      }

      const program = Effect.Do()
        .bind("fiber1", () => Effect.forkAll(List(die)))
        .bind("fiber2", () => Effect.forkAll(List(die, Effect.succeed(42))))
        .bind("fiber3", () =>
          Effect.forkAll(List(die, Effect.succeed(42), Effect.never))
        )
        .bind("result1", ({ fiber1 }) =>
          joinDefect(fiber1).map((cause) => cause.untraced())
        )
        .bind("result2", ({ fiber2 }) =>
          joinDefect(fiber2).map((cause) => cause.untraced())
        )
        .bind("result3", ({ fiber3 }) =>
          joinDefect(fiber3).map((cause) => cause.untraced())
        )

      const { result1, result2, result3 } = await program.unsafeRunPromise()

      expect(result1.dieOption()).toEqual(Option.some(boom))
      expect(result2.dieOption()).toEqual(Option.some(boom))
      expect(result3.dieOption()).toEqual(Option.some(boom))
      expect(result3.isInterrupted()).toBe(true)
    })

    it("infers correctly", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("worker", () => Effect.never)
        .bindValue("workers", ({ worker }) => List.repeat(worker, 4))
        .bind("fiber", ({ workers }) => Effect.forkAll(workers))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("infers correctly with error type", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("worker", () => Effect.fail(new RuntimeError("fail")).forever())
        .bindValue("workers", ({ worker }) => List.repeat(worker, 4))
        .bind("fiber", ({ workers }) => Effect.forkAll(workers))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })

  describe("forkWithErrorHandler", () => {
    it("calls provided function when task fails", async () => {
      const program = Promise.make<never, void>()
        .tap((promise) =>
          Effect.fail(undefined).forkWithErrorHandler((e) =>
            promise.succeed(e).asUnit()
          )
        )
        .flatMap((promise) => promise.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("head", () => {
    it("on non empty list", async () => {
      const program = Effect.succeed(List(1, 2, 3)).head.either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(1))
    })

    it("on empty list", async () => {
      const program = Effect.succeed(List.empty<number>()).head.either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Option.none))
    })

    it("on failure", async () => {
      const program = Effect.fail("fail").head.either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Option.some("fail")))
    })
  })

  describe("ifEffect", () => {
    it("runs `onTrue` if result of `b` is `true`", async () => {
      const program = Effect.ifEffect(
        Effect.succeed(true),
        Effect.succeed(true),
        Effect.succeed(false)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("runs `onFalse` if result of `b` is `false`", async () => {
      const program = Effect.ifEffect(
        Effect.succeed(false),
        Effect.succeed(true),
        Effect.succeed(false)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("ignore", () => {
    it("return success as unit", async () => {
      const program = Effect.succeed(11).ignore()

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("return failure as unit", async () => {
      const program = Effect.fail(123).ignore()

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("not catch throwable", async () => {
      const program = Effect.die(ExampleError).ignore()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })
  })

  describe("isFailure", () => {
    it("returns true when the effect is a failure", async () => {
      const program = Effect.fail("fail").isFailure()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("returns false when the effect is a success", async () => {
      const program = Effect.succeed("succeed").isFailure()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("isSuccess", () => {
    it("returns false when the effect is a failure", async () => {
      const program = Effect.fail("fail").isSuccess()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("returns true when the effect is a success", async () => {
      const program = Effect.succeed("succeed").isSuccess()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("iterate", () => {
    it("iterates with the specified effectual function", async () => {
      const program = Effect.iterate(100, (n) => n > 0)((n) => Effect.succeed(n - 1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })

  describe("left", () => {
    it("on Left value", async () => {
      const program = Effect.succeed(Either.left("left")).left

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("left")
    })

    it("on Right value", async () => {
      const program = Effect.succeed(Either.right("right")).left

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.right("right")))
    })

    it("on failure", async () => {
      const program = Effect.fail("fail").left

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.left("fail")))
    })
  })

  describe("loop", () => {
    it("loops with the specified effectual function", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .tap(({ ref }) =>
          Effect.loop(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.append(n)))
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(0, 1, 2, 3, 4))
    })

    it("collects the results into a list", async () => {
      const program = Effect.loop(
        0,
        (n) => n < 5,
        (n) => n + 2
      )((n) => Effect.succeed(n * 3)).map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([0, 6, 12])
    })
  })

  describe("loopDiscard", () => {
    it("loops with the specified effectual function", async () => {
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.loopDiscard(
            0,
            (n) => n < 5,
            (n) => n + 1
          )((n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(0, 1, 2, 3, 4))
    })
  })

  describe("mapBoth", () => {
    it("maps over both error and value channels", async () => {
      const program = Effect.fail(10)
        .mapBoth((n) => n.toString(), identity)
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("10"))
    })
  })

  describe("mapTryCatch", () => {
    it("returns an effect whose success is mapped by the specified side effecting function", async () => {
      function parseInt(s: string): number {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
          throw new IllegalArgumentException()
        }
        return n
      }

      const program = Effect.succeed("123").mapTryCatch(parseInt, identity)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(123)
    })

    it("translates any thrown exceptions into typed failed effects", async () => {
      function parseInt(s: string): number {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
          throw new IllegalArgumentException()
        }
        return n
      }

      const program = Effect.succeed("hello").mapTryCatch(parseInt, identity)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new IllegalArgumentException()))
    })
  })

  describe("memoize", () => {
    it("non-memoized returns new instances on repeated calls", async () => {
      const io = Random.nextInt
      const program = io.zip(io)

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      expect(first).not.toBe(second)
    })

    it("memoized returns the same instance on repeated calls", async () => {
      const ioMemo = Random.nextInt.memoize()
      const program = ioMemo.flatMap((io) => io.zip(io))

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      expect(first).toBe(second)
    })

    it("memoized function returns the same instance on repeated calls", async () => {
      const program = Random.withSeed(100)(
        Effect.Do()
          .bind("memoized", () =>
            Effect.memoize((n: number) => Random.nextIntBetween(n, n + n))
          )
          .bind("a", ({ memoized }) => memoized(10))
          .bind("b", ({ memoized }) => memoized(10))
          .bind("c", ({ memoized }) => memoized(11))
          .bind("d", ({ memoized }) => memoized(11))
      )

      const { a, b, c, d } = await program.unsafeRunPromise()

      expect(a).toBe(b)
      expect(b).not.toBe(c)
      expect(c).toBe(d)
    })
  })

  describe("merge", () => {
    it("on flipped result", async () => {
      const effect: IO<number, number> = Effect.succeed(1)
      const program = Effect.struct({
        a: effect.merge(),
        b: effect.flip().merge()
      })

      const { a, b } = await program.unsafeRunPromise()

      expect(a).toBe(b)
    })
  })

  describe("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = Effect.mergeAll(
        List.empty<UIO<unknown>>(),
        zeroElement,
        () => nonZero
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("merge list using function", async () => {
      const effects = List(3, 5, 7).map(Effect.succeedNow)
      const program = Effect.mergeAll(effects, 1, (b, a) => b + a)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if it exists in list", async () => {
      const effects = List<IO<number, void>>(Effect.unit, Effect.fail(1))
      const program = Effect.mergeAll(effects, undefined, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })

  describe("mergeAllPar", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = Effect.mergeAllPar(
        List.empty<UIO<unknown>>(),
        zeroElement,
        () => nonZero
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("merge list using function", async () => {
      const effects = List(3, 5, 7).map(Effect.succeedNow)
      const program = Effect.mergeAllPar(effects, 1, (b, a) => b + a)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if it exists in list", async () => {
      const effects = List<IO<number, void>>(Effect.unit, Effect.fail(1))
      const program = Effect.mergeAllPar(effects, undefined, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })

  describe("none", () => {
    it("on Some fails with None", async () => {
      const program = Effect.succeed(Option.some(1)).none

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.none))
    })

    it("on None succeeds with undefined", async () => {
      const program = Effect.succeed(Option.none).none

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("fails with Some(ex) when effect fails with ex", async () => {
      const error = new RuntimeError("failed task")
      const program = Effect.fail(error).none

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.some(error)))
    })
  })

  describe("noneOrFail", () => {
    it("on None succeeds with Unit", async () => {
      const program = Effect.noneOrFail(Option.none)

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("on Some fails", async () => {
      const program = Effect.noneOrFail(Option.some("some")).catchAll(Effect.succeedNow)

      const result = await program.unsafeRunPromise()

      expect(result).toBe("some")
    })
  })

  describe("noneOrFailWith", () => {
    it("on None succeeds with Unit", async () => {
      const program = Effect.noneOrFailWith(Option.none, identity)

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("on Some fails", async () => {
      const program = Effect.noneOrFailWith(Option.some("some"), (s) => s + s).catchAll(
        Effect.succeedNow
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("somesome")
    })
  })

  describe("fork", () => {
    it("propagates interruption", async () => {
      const program = Effect.never.fork().flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("propagates interruption with zip of defect", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch }) =>
          (latch.succeed(undefined) > Effect.die(new Error()))
            .zipPar(Effect.never)
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .flatMap(({ fiber }) =>
          fiber
            .interrupt()
            .map((exit) => exit.mapErrorCause((cause) => cause.untraced()))
        )

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })
  })

  describe("negate", () => {
    it("on true returns false", async () => {
      const program = Effect.succeed(true).negate()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("on false returns true", async () => {
      const program = Effect.succeed(false).negate()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("once", () => {
    it("returns an effect that will only be executed once", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("effect", ({ ref }) => ref.update((n) => n + 1).once())
        .tap(({ effect }) => Effect.collectAllPar(effect.replicate(100)))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("onExit", () => {
    it("executes that a cleanup function runs when effect succeeds", async () => {
      const program = Ref.make(false)
        .tap((ref) =>
          Effect.unit.onExit((exit) =>
            exit.fold(
              () => Effect.unit,
              () => ref.set(true)
            )
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("ensures that a cleanup function runs when an effect fails", async () => {
      const program = Ref.make(false)
        .tap((ref) =>
          Effect.die(new RuntimeError())
            .onExit((exit) =>
              exit._tag === "Failure" && exit.cause.isDie()
                ? ref.set(true)
                : Effect.unit
            )
            .sandbox()
            .ignore()
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("ensures that a cleanup function runs when an effect is interrupted", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("fiber", ({ latch1, latch2 }) =>
          (latch1.succeed(undefined) > Effect.never)
            .onExit((exit) =>
              exit.isFailure() && exit.cause.isInterrupted()
                ? latch2.succeed(undefined)
                : Effect.unit
            )
            .fork()
        )
        .tap(({ latch1 }) => latch1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ latch2 }) => latch2.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("option", () => {
    it("return success in Some", async () => {
      const program = Effect.succeed(11).option()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(11))
    })

    it("return failure as None", async () => {
      const program = Effect.fail(123).option()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("not catch throwable", async () => {
      const program = Effect.die(ExampleError).option()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("catch throwable after sandboxing", async () => {
      const program = Effect.die(ExampleError).sandbox().option()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("unsome", () => {
    it("fails when given Some error", async () => {
      const program = Effect.fail(Option.some("error")).unsome()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("succeeds with None given None error", async () => {
      const program = Effect.fail(Option.none).unsome()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("succeeds with Some given a value", async () => {
      const program = Effect.succeed(1).unsome()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })
  })

  describe("orElse", () => {
    it("does not recover from defects", async () => {
      const error = new Error("died")
      const fiberId = FiberId(0, 123, TraceElement.empty)
      const program = Effect.Do()
        .bind("plain", () => (Effect.die(error) | Effect.unit).exit())
        .bind("both", () =>
          (
            Effect.failCause(Cause.both(Cause.interrupt(fiberId), Cause.die(error))) |
            Effect.unit
          ).exit()
        )
        .bind("then", () =>
          (
            Effect.failCause(Cause.then(Cause.interrupt(fiberId), Cause.die(error))) |
            Effect.unit
          ).exit()
        )
        .bind("fail", () => (Effect.fail(error) | Effect.unit).exit())

      const { both, fail, plain, then } = await program.unsafeRunPromise()

      expect(plain.untraced()).toEqual(Exit.die(error))
      expect(both.untraced()).toEqual(Exit.die(error))
      expect(then.untraced()).toEqual(Exit.die(error))
      expect(fail.untraced()).toEqual(Exit.succeed(undefined))
    })

    it("left failed and right died with kept cause", async () => {
      const z1 = Effect.fail(new Error("1"))
      const z2 = Effect.die(new Error("2"))
      const program = (z1 | z2).catchAllCause((cause) =>
        cause.isDieType()
          ? Effect.succeed((cause.value as Error).message === "2")
          : Effect.succeed(false)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("left failed and right failed with kept cause", async () => {
      const z1 = Effect.fail(new Error("1"))
      const z2 = Effect.fail(new Error("2"))
      const program = (z1 | z2).catchAllCause((cause) =>
        cause.isFailType()
          ? Effect.succeed((cause.value as Error).message === "2")
          : Effect.succeed(false)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    // TODO(Mike/Max): implement once Gen has been implemented
    // it("is associative", async () => {
    //   val smallInts = Gen.int(0, 100)
    //   val causes    = Gen.causes(smallInts, Gen.throwable)
    //   val successes = Gen.successes(smallInts)
    //   val exits     = Gen.either(causes, successes).map(_.fold(Exit.failCause, Exit.succeed))
    //   check(exits, exits, exits) { (exit1, exit2, exit3) =>
    //     val zio1  = ZIO.done(exit1)
    //     val zio2  = ZIO.done(exit2)
    //     val zio3  = ZIO.done(exit3)
    //     val left  = (zio1 orElse zio2) orElse zio3
    //     val right = zio1 orElse (zio2 orElse zio3)
    //     for {
    //       left  <- left.exit
    //       right <- right.exit
    //     } yield assert(left)(equalTo(right))
    //   }
    // })
  })

  describe("orElseFail", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const program = Effect.succeed(true).orElseFail(false)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("otherwise fails with the specified error", async () => {
      const program = Effect.fail(false).orElseFail(true).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("orElseOptional", () => {
    it("produces the value of this effect if it succeeds", async () => {
      const program = Effect.succeed("succeed").orElseOptional(Effect.succeed("orElse"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("succeed")
    })

    it("produces the value of this effect if it fails with some error", async () => {
      const program = Effect.fail(Option.some("fail")).orElseOptional(
        Effect.succeed("orElse")
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.some("fail")))
    })

    it("produces the value of the specified effect if it fails with none", async () => {
      const program = Effect.fail(Option.none).orElseOptional(Effect.succeed("orElse"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("orElse")
    })
  })

  describe("orElseSucceed", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const program = Effect.succeed(true).orElseSucceed(false)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("otherwise succeeds with the specified value", async () => {
      const program = Effect.fail(false).orElseSucceed(true)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("parallelErrors", () => {
    it("oneFailure", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.fail("error1").fork())
        .bind("f2", () => Effect.succeed("success1").fork())
        .flatMap(({ f1, f2 }) =>
          f1
            .zip(f2)
            .join()
            .parallelErrors()
            .flip()
            .map((chunk) => chunk.toArray())
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["error1"])
    })

    it("allFailures", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.fail("error1").fork())
        .bind("f2", () => Effect.fail("error2").fork())
        .flatMap(({ f1, f2 }) =>
          f1
            .zip(f2)
            .join()
            .parallelErrors()
            .flip()
            .map((chunk) => chunk.toArray())
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["error1", "error2"])
    })
  })

  describe("partition", () => {
    it("collects only successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partition(list, (n) => Effect.succeed(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List.empty())
      expect(right).toEqual(list)
    })

    it("collects only failures", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.partition(list, (n) => Effect.fail(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(list)
      expect(right).toEqual(List.empty())
    })

    it("collects failures and successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partition(list, (n) =>
        n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)
      )

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List(0, 2, 4, 6, 8))
      expect(right).toEqual(List(1, 3, 5, 7, 9))
    })

    it("evaluates effects in correct order", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Effect.partition(list, (n) => ref.update((list) => list.append(n)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(2, 4, 6, 3, 5, 6))
    })
  })

  describe("partitionPar", () => {
    it("collects a lot of successes", async () => {
      const list = List.range(0, 1000)
      const program = Effect.partitionPar(list, (n) => Effect.succeed(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List.empty())
      expect(right).toEqual(list)
    })

    it("collects failures", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.partitionPar(list, (n) => Effect.fail(n))

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(list)
      expect(right).toEqual(List.empty())
    })

    it("collects failures and successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partitionPar(list, (n) =>
        n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)
      )

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List(0, 2, 4, 6, 8))
      expect(right).toEqual(List(1, 3, 5, 7, 9))
    })
  })

  describe("partitionPar - parallelism", () => {
    it("collects a lot of successes", async () => {
      const list = List.range(0, 1000)
      const program = Effect.partitionPar(list, (n) =>
        Effect.succeed(n)
      ).withParallelism(3)

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List.empty())
      expect(right).toEqual(list)
    })

    it("collects failures", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.partitionPar(list, (n) => Effect.fail(n)).withParallelism(
        3
      )

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(list)
      expect(right).toEqual(List.empty())
    })

    it("collects failures and successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.partitionPar(list, (n) =>
        n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)
      ).withParallelism(3)

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise()

      expect(left).toEqual(List(0, 2, 4, 6, 8))
      expect(right).toEqual(List(1, 3, 5, 7, 9))
    })
  })

  describe("provideSomeLayer", () => {
    it("can split environment into two parts", async () => {
      const clockLayer: Layer<{}, never, HasClock> = Layer.fromValue(HasClock)(
        new LiveClock()
      )
      const effect: Effect<HasClock & HasRandom, never, void> = Effect.unit
      const program: Effect<HasRandom, never, boolean> = effect
        .map(constTrue)
        .provideSomeLayer(clockLayer)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("raceAll", () => {
    it("returns first success", async () => {
      const program = Effect.fail("fail").raceAll(List(Effect.succeed(24)))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })

    it("returns last failure", async () => {
      const program = (Effect.sleep(100) > Effect.fail(24))
        .raceAll(List(Effect.fail(25)))
        .flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })

    it("returns success when it happens after failure", async () => {
      const program = Effect.fail(42).raceAll(
        List(Effect.succeed(24) < Effect.sleep(100))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })
  })

  describe("reduceAllPar", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = Effect.reduceAllPar(
        Effect.succeed(zeroElement),
        List.empty(),
        () => nonZero
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("reduce list using function", async () => {
      const zeroElement = Effect.succeed(1)
      const otherEffects = List(3, 5, 7).map(Effect.succeedNow)
      const program = Effect.reduceAllPar(
        zeroElement,
        otherEffects,
        (acc, a) => acc + a
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if zero is an error", async () => {
      const zeroElement = Effect.fail(1)
      const otherEffects = List(Effect.unit, Effect.unit)
      const program = Effect.reduceAllPar(zeroElement, otherEffects, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })

    it("return error if it exists in list", async () => {
      const zeroElement = Effect.unit
      const effects = List<IO<number, void>>(Effect.unit, Effect.fail(1))
      const program = Effect.reduceAllPar(zeroElement, effects, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })

  describe("replicate", () => {
    it("zero", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(0)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("negative", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(-2)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([])
    })

    it("positive", async () => {
      const program = Effect.collectAll(Effect.succeed(12).replicate(2)).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([12, 12])
    })
  })

  describe("retryUntil", () => {
    it("retries until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntil((n) => n === 0)
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).flipWith((effect) => effect.retryUntil(constTrue))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("retryUntilEquals", () => {
    it("retries until error equals predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take() < acc.update((n) => n + 1)).flipWith((effect) =>
            effect.retryUntilEquals(Equal.number)(5)
          )
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("retryUntilEffect", () => {
    it("retries until condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryUntilEffect((n) => Effect.succeed(n === 0))
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref
            .update((n) => n + 1)
            .flipWith((effect) => effect.retryUntilEffect(() => Effect.succeed(true)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("retryWhile", () => {
    it("retries while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhile((n) => n >= 0)
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref.update((n) => n + 1).flipWith((effect) => effect.retryWhile(constFalse))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("retryWhileEquals", () => {
    it("retries while error equals predicate", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(List(0, 0, 0, 0, 1, 2)))
        .bind("acc", () => Ref.make(0))
        .tap(({ acc, queue }) =>
          (queue.take() < acc.update((n) => n + 1)).flipWith((effect) =>
            effect.retryWhileEquals(Equal.number)(0)
          )
        )
        .flatMap(({ acc }) => acc.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })
  })

  describe("retryWhileEffect", () => {
    it("retries while condition is true", async () => {
      const program = Effect.Do()
        .bind("input", () => Ref.make(10))
        .bind("output", () => Ref.make(0))
        .tap(({ input, output }) =>
          (input.updateAndGet((n) => n - 1) < output.update((n) => n + 1)).flipWith(
            (effect) => effect.retryWhileEffect((n) => Effect.succeed(n >= 0))
          )
        )
        .flatMap(({ output }) => output.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(11)
    })

    it("runs at least once", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          ref
            .update((n) => n + 1)
            .flipWith((effect) => effect.retryWhileEffect(() => Effect.succeed(false)))
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("right", () => {
    it("on Right value", async () => {
      const program = Effect.succeed(Either.right("right")).right

      const result = await program.unsafeRunPromise()

      expect(result).toBe("right")
    })

    it("on Left value", async () => {
      const program = Effect.succeed(Either.left("left")).right

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.left("left")))
    })

    it("on failure", async () => {
      const program = Effect.fail("fail").right

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.right("fail")))
    })
  })

  describe("some", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.succeed(Option.some(1)).some

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("fails on None", async () => {
      const program = Effect.succeed(Option.none).some

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.none))
    })

    it("fails when given an exception", async () => {
      const error = new RuntimeError("failed")
      const program = Effect.fail(error).some

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.some(error)))
    })
  })

  describe("getOrFail", () => {
    it("make a task from a defined option", async () => {
      const program = Effect.getOrFail(Option.some(1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("make a task from an empty option", async () => {
      const program = Effect.getOrFail(Option.none)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(new NoSuchElementException()))
    })
  })

  describe("someOrFailException", () => {
    it("extracts the optional value", async () => {
      const program = Effect.some(42).someOrFailException()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("fails when given a None", async () => {
      const program = Effect.succeed(Option.none).someOrFailException()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(new NoSuchElementException()))
    })
  })

  describe("reject", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.struct({
        goodCase: exactlyOnce(0, (effect) =>
          effect.reject((n) => (n !== 0 ? Option.some("partial failed!") : Option.none))
        )
          .sandbox()
          .either(),
        badCase: exactlyOnce(1, (effect) =>
          effect.reject((n) => (n !== 0 ? Option.some("partial failed!") : Option.none))
        )
          .sandbox()
          .either()
          .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
      })

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("partial failed!")))
    })
  })

  describe("rejectEffect", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.struct({
        goodCase: exactlyOnce(0, (effect) =>
          effect.rejectEffect((n) =>
            n !== 0 ? Option.some(Effect.succeed("partial failed!")) : Option.none
          )
        )
          .sandbox()
          .either(),
        partialBadCase: exactlyOnce(0, (effect) =>
          effect.rejectEffect((n) =>
            n !== 0 ? Option.some(Effect.fail("partial failed!")) : Option.none
          )
        )
          .sandbox()
          .either()
          .map((either) => either.mapLeft((cause) => cause.failureOrCause())),
        badCase: exactlyOnce(1, (effect) =>
          effect.rejectEffect((n) =>
            n !== 0 ? Option.some(Effect.fail("partial failed!")) : Option.none
          )
        )
          .sandbox()
          .either()
          .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
      })

      const { badCase, goodCase, partialBadCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(partialBadCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("partial failed!")))
    })
  })

  describe("RTS synchronous correctness", () => {
    it("succeed must be lazy", async () => {
      let program
      try {
        program = Effect.succeed(() => {
          throw new Error("shouldn't happen!")
        })
        program = Effect.succeed(true)
      } catch {
        program = Effect.succeed(false)
      }

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("suspend must be lazy", async () => {
      let program
      try {
        program = Effect.suspend(() => {
          throw new Error("shouldn't happen!")
        })
        program = Effect.succeed(true)
      } catch {
        program = Effect.succeed(false)
      }

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("suspendSucceed must be evaluatable", async () => {
      const program = Effect.suspendSucceed(Effect.succeed(42))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("suspendSucceed must not catch throwable", async () => {
      const program = Effect.suspendSucceed(() => {
        throw new Error("woops")
      })
        .sandbox()
        .either()
        .map((either) => either.mapLeft((cause) => cause.untraced()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Cause.die(new Error("woops"))))
    })

    it("suspend must catch throwable", async () => {
      const error = new Error("woops")
      const program = Effect.suspend(() => {
        throw error
      }).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(error))
    })

    it("suspendWith must catch throwable", async () => {
      const error = new Error("woops")
      const program = Effect.suspendWith(() => {
        throw error
      }).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(error))
    })

    it("point, bind, map", async () => {
      function fibEffect(n: number): UIO<number> {
        if (n <= 1) {
          return Effect.succeed(n)
        }
        return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
      }

      const result = await fibEffect(10).unsafeRunPromise()

      expect(result).toBe(fib(10))
    })

    it("effect, bind, map", async () => {
      function fibEffect(n: number): Effect<unknown, unknown, number> {
        if (n <= 1) {
          return Effect.attempt(n)
        }
        return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
      }

      const result = await fibEffect(10).unsafeRunPromise()

      expect(result).toBe(fib(10))
    })

    it("effect, bind, map, redeem", async () => {
      function fibEffect(n: number): Effect<unknown, unknown, number> {
        if (n <= 1) {
          return Effect.attempt(() => {
            throw ExampleError
          }).catchAll(() => Effect.attempt(n))
        }
        return fibEffect(n - 1).zipWith(fibEffect(n - 2), (a, b) => a + b)
      }

      const result = await fibEffect(10).unsafeRunPromise()

      expect(result).toBe(fib(10))
    })

    it("sync effect", async () => {
      function sumEffect(n: number): Effect<unknown, unknown, number> {
        if (n < 0) {
          return Effect.succeed(0)
        }
        return Effect.succeed(n).flatMap((b) => sumEffect(n - 1).map((a) => a + b))
      }

      const result = await sumEffect(1000).unsafeRunPromise()

      expect(result).toBe(sum(1000))
    })

    it("deep effects", async () => {
      function incLeft(n: number, ref: Ref<number>): UIO<number> {
        if (n <= 0) {
          return ref.get()
        }
        return incLeft(n - 1, ref) < ref.update((n) => n + 1)
      }

      function incRight(n: number, ref: Ref<number>): UIO<number> {
        if (n <= 0) {
          return ref.get()
        }
        return ref.update((n) => n + 1) > incRight(n - 1, ref)
      }

      const left = Ref.make(0)
        .flatMap((ref) => incLeft(100, ref))
        .map((n) => n === 0)
      const right = Ref.make(0)
        .flatMap((ref) => incRight(1000, ref))
        .map((n) => n === 1000)
      const program = left.zipWith(right, (a, b) => a && b)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("flip must make error into value", async () => {
      const program = Effect.fail(ExampleError).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(ExampleError)
    })

    it("flip must make value into error", async () => {
      const program = Effect.succeed(42).flip().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(42))
    })

    it("flipping twice returns the identical value", async () => {
      const program = Effect.succeed(42).flip().flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })

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
      const program = (Effect.sleep(5000) > Effect.succeed(true)).timeoutFail(false, 10)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(false))
    })

    it("timeout a long computation with a cause", async () => {
      const cause = Cause.die(new Error("boom"))
      const program = (Effect.sleep(5000) > Effect.succeed(true))
        .timeoutFailCause(cause, 10)
        .sandbox()
        .flip()

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(cause)
    })

    // TODO(Mike/Max): infinite loop (?)
    it.skip("timeout repetition of uninterruptible effect", async () => {
      const program = Effect.unit.uninterruptible().forever().timeout(10)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("timeout in uninterruptible region", async () => {
      const program = Effect.unit.timeout(20000).uninterruptible()

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

  describe("RTS finalizers", () => {
    it("fail ensuring", async () => {
      let finalized = false
      const program = Effect.fail(ExampleError).ensuring(
        Effect.succeed(() => {
          finalized = true
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      expect(finalized).toBe(true)
    })

    it("fail on error", async () => {
      let finalized = false
      const program = Effect.fail(ExampleError).onError((cause) =>
        Effect.succeed(() => {
          finalized = true
        })
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      expect(finalized).toBe(true)
    })

    it("finalizer errors not caught", async () => {
      const e2 = new Error("e2")
      const e3 = new Error("e3")
      const program = ExampleErrorFail.ensuring(Effect.die(e2))
        .ensuring(Effect.die(e3))
        .sandbox()
        .flip()
        .map((cause) => cause.untraced())

      const result = await program.unsafeRunPromise()

      const expectedCause = Cause.fail(ExampleError) + Cause.die(e2) + Cause.die(e3)

      expect(result).toEqual(expectedCause)
    })

    it("finalizer errors reported", async () => {
      let reported: Exit<never, number> | undefined
      const program = Effect.succeed(42)
        .ensuring(Effect.die(ExampleError))
        .fork()
        .flatMap((fiber) =>
          fiber.await().flatMap((e) =>
            Effect.succeed(() => {
              reported = e
            })
          )
        )
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(true)
      expect(reported && reported.isSuccess()).toBe(false)
    })

    it("acquireReleaseWith exit is usage result", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.succeed(42),
        () => Effect.unit
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("error in just acquisition", async () => {
      const program = Effect.acquireReleaseWith(
        ExampleErrorFail,
        () => Effect.unit,
        () => Effect.unit
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("error in just release", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.unit,
        () => Effect.die(ExampleError)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("error in just usage", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.fail(ExampleError),
        () => Effect.unit
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("rethrown caught error in acquisition", async () => {
      const program = Effect.absolve(
        Effect.acquireReleaseWith(
          ExampleErrorFail,
          () => Effect.unit,
          () => Effect.unit
        ).either()
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(ExampleError)
    })

    it("rethrown caught error in release", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.unit,
        () => Effect.die(ExampleError)
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("rethrown caught error in usage", async () => {
      const program = Effect.absolve(
        Effect.unit.acquireRelease(ExampleErrorFail, Effect.unit).either()
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("test eval of async fail", async () => {
      const io1 = Effect.unit.acquireRelease(asyncExampleError(), asyncUnit())
      const io2 = asyncUnit().acquireRelease(asyncExampleError(), asyncUnit())
      const program = Effect.Do()
        .bind("a1", () => io1.exit().map((exit) => exit.untraced()))
        .bind("a2", () => io2.exit().map((exit) => exit.untraced()))
        .bind("a3", () =>
          Effect.absolve(io1.either())
            .exit()
            .map((exit) => exit.untraced())
        )
        .bind("a4", () =>
          Effect.absolve(io2.either())
            .exit()
            .map((exit) => exit.untraced())
        )

      const { a1, a2, a3, a4 } = await program.unsafeRunPromise()

      expect(a1).toEqual(Exit.fail(ExampleError))
      expect(a2).toEqual(Exit.fail(ExampleError))
      expect(a3).toEqual(Exit.fail(ExampleError))
      expect(a4).toEqual(Exit.fail(ExampleError))
    })

    it("acquireReleaseWith regression 1", async () => {
      function makeLogger(ref: Ref<List<string>>) {
        return (line: string): UIO<void> => ref.update((list) => list + List(line))
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<string>()))
        .bindValue("log", ({ ref }) => makeLogger(ref))
        .bind("fiber", ({ log }) =>
          Effect.acquireReleaseWith(
            Effect.acquireReleaseWith(
              Effect.unit,
              () => Effect.unit,
              () => log("start 1") > Effect.sleep(10) > log("release 1")
            ),
            () => Effect.unit,
            () => log("start 2") > Effect.sleep(10) > log("release 2")
          ).fork()
        )
        .tap(({ ref }) =>
          (ref.get() < Effect.sleep(1)).repeatUntil((list) => list.contains("start 1"))
        )
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ ref }) =>
          (ref.get() < Effect.sleep(1)).repeatUntil((list) =>
            list.contains("release 2")
          )
        )
        .flatMap(({ ref }) => ref.get().map((list) => list.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toContain("start 1")
      expect(result).toContain("release 1")
      expect(result).toContain("start 2")
      expect(result).toContain("release 2")
    })

    it("interrupt waits for finalizer", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, number>())
        .bind("fiber", ({ promise1, promise2, ref }) =>
          (promise1.succeed(undefined) > promise2.await())
            .ensuring(ref.set(true) > Effect.sleep(10))
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("RTS synchronous stack safety", () => {
    it("deep map of sync effect", async () => {
      const program = deepMapEffect(10000)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })

    it("deep attempt", async () => {
      const program = List.range(0, 10000).reduce(
        Effect.attempt<void>(undefined).foldEffect(Effect.dieNow, Effect.succeedNow),
        (acc, _) => acc.foldEffect(Effect.dieNow, Effect.succeedNow).either().asUnit()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("deep flatMap", async () => {
      function fib(
        n: number,
        a: BigInt = BigInt("0"),
        b: BigInt = BigInt("1")
      ): IO<Error, BigInt> {
        return Effect.succeed(() => ((a as any) + (b as any)) as BigInt).flatMap((b2) =>
          n > 0 ? fib(n - 1, b, b2) : Effect.succeed(b2)
        )
      }

      const result = await fib(1000).unsafeRunPromise()

      const expected = BigInt(
        "113796925398360272257523782552224175572745930353730513145086634176691092536145985470146129334641866902783673042322088625863396052888690096969577173696370562180400527049497109023054114771394568040040412172632376"
      )

      expect(result).toEqual(expected)
    })

    it("deep absolve/attempt is identity", async () => {
      const program = List.range(0, 1000).reduce(Effect.succeed(42), (acc, _) =>
        Effect.absolve(acc.either())
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("deep async absolve/attempt is identity", async () => {
      const program = List.range(0, 1000).reduce(
        Effect.async((cb) => {
          cb(Effect.succeed(42))
        }),
        (acc, _) => Effect.absolve(acc.either())
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })

  describe("RTS asynchronous correctness", () => {
    it("simple async must return", async () => {
      const program = Effect.async((cb) => {
        cb(Effect.succeed(42))
      })

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("simple asyncEffect must return", async () => {
      const program = Effect.asyncEffect((cb) => Effect.succeed(cb(Effect.succeed(42))))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("deep asyncEffect doesn't block", async () => {
      function asyncIO(cont: RIO<HasClock, number>): RIO<HasClock, number> {
        return Effect.asyncEffect(
          (cb) => Effect.sleep(5) > cont > Effect.succeed(cb(Effect.succeed(42)))
        )
      }

      function stackIOs(count: number): RIO<HasClock, number> {
        return count < 0 ? Effect.succeed(42) : asyncIO(stackIOs(count - 1))
      }

      const procNum = Effect.succeed(os.cpus().length)

      const program = procNum.flatMap((procNum) => stackIOs(procNum))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(42)
    })

    it("interrupt of asyncEffect register", async () => {
      const program = Effect.Do()
        .bind("release", () => Promise.make<never, void>())
        .bind("acquire", () => Promise.make<never, void>())
        .bind("fiber", ({ acquire, release }) =>
          Effect.asyncEffect(() =>
            // This will never complete because we never call the callback
            acquire
              .succeed(undefined)
              .acquireRelease(Effect.never, release.succeed(undefined))
          )
            .disconnect()
            .fork()
        )
        .tap(({ acquire }) => acquire.await())
        .tap(({ fiber }) => fiber.interruptFork())
        .flatMap(({ release }) => release.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("async should not resume fiber twice after interruption", async () => {
      const program = Effect.Do()
        .bind("step", () => Promise.make<never, void>())
        .bind("unexpectedPlace", () => Ref.make(List.empty<number>()))
        .bind("runtime", () => Effect.runtime())
        .bind("fork", ({ runtime, step, unexpectedPlace }) =>
          Effect.async<unknown, never, void>((cb) =>
            runtime.unsafeRunAsync(
              step.await() >
                Effect.succeed(cb(unexpectedPlace.update((list) => list.prepend(1))))
            )
          )
            .ensuring(
              Effect.async<unknown, never, void>(() => {
                // The callback is never called so this never completes
                runtime.unsafeRunAsync(step.succeed(undefined))
              })
            )
            .ensuring(unexpectedPlace.update((list) => list.prepend(2)))
            .forkDaemon()
        )
        .bind("result", ({ fork }) => fork.interrupt().timeout(1000))
        .bind("unexpected", ({ unexpectedPlace }) => unexpectedPlace.get())

      const { result, unexpected } = await program.unsafeRunPromise()

      expect(unexpected).toEqual(List.empty())
      expect(result).toEqual(Option.none) // the timeout should happen
    })

    it("asyncMaybe should not resume fiber twice after synchronous result", async () => {
      const program = Effect.Do()
        .bind("step", () => Promise.make<never, void>())
        .bind("unexpectedPlace", () => Ref.make(List.empty<number>()))
        .bind("runtime", () => Effect.runtime())
        .bind("fork", ({ runtime, step, unexpectedPlace }) =>
          Effect.asyncMaybe<unknown, never, void>((cb) => {
            runtime.unsafeRunAsync(
              step.await() >
                Effect.succeed(cb(unexpectedPlace.update((list) => list.prepend(1))))
            )
            return Option.some(Effect.unit)
          })
            .flatMap(() =>
              Effect.async<unknown, never, void>(() => {
                // The callback is never called so this never completes
                runtime.unsafeRunAsync(step.succeed(undefined))
              })
            )
            .ensuring(unexpectedPlace.update((list) => list.prepend(2)))
            .uninterruptible()
            .forkDaemon()
        )
        .bind("result", ({ fork }) => fork.interrupt().timeout(1000))
        .bind("unexpected", ({ unexpectedPlace }) => unexpectedPlace.get())

      const { result, unexpected } = await program.unsafeRunPromise()

      expect(unexpected).toEqual(List.empty())
      expect(result).toEqual(Option.none) // timeout should happen
    })

    it("sleep 0 must return", async () => {
      const program = Effect.sleep(0)

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("shallow bind of async chain", async () => {
      const program = List.range(0, 10).reduce(Effect.succeed(0), (acc, _) =>
        acc.flatMap((n) =>
          Effect.async((cb) => {
            cb(Effect.succeed(n + 1))
          })
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("asyncEffect can fail before registering", async () => {
      const program = Effect.asyncEffect((cb) => Effect.fail("ouch")).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("ouch")
    })

    it("asyncEffect can defect before registering", async () => {
      const program = Effect.asyncEffect((cb) =>
        Effect.succeed(() => {
          throw new Error("ouch")
        })
      )
        .exit()
        .map((exit) =>
          exit.fold(
            (cause) => cause.defects().first.map((e) => (e as Error).message),
            () => Option.none
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("ouch"))
    })
  })

  describe("RTS concurrency correctness", () => {
    it("shallow fork/join identity", async () => {
      const program = Effect.succeed(42)
        .fork()
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("deep fork/join identity", async () => {
      const result = await concurrentFib(20).unsafeRunPromise()

      expect(result).toBe(fib(20))
    })

    it("asyncEffect creation is interruptible", async () => {
      const program = Effect.Do()
        .bind("release", () => Promise.make<never, number>())
        .bind("acquire", () => Promise.make<never, void>())
        .bindValue("task", ({ acquire, release }) =>
          Effect.asyncEffect((cb) =>
            // This will never complete because the callback is never invoked
            Effect.acquireReleaseWith(
              acquire.succeed(undefined),
              () => Effect.never,
              () => release.succeed(42).asUnit()
            )
          )
        )
        .bind("fiber", ({ task }) => task.fork())
        .tap(({ acquire }) => acquire.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ release }) => release.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    // FIXED: interrupt joined fiber after forking daemon
    it("daemon fiber is unsupervised", async () => {
      function child(ref: Ref<boolean>) {
        return withLatch((release) => (release > Effect.never).ensuring(ref.set(true)))
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber1", ({ ref }) => child(ref).forkDaemon().fork())
        .bind("fiber2", ({ fiber1 }) => fiber1.join())
        .bind("result", ({ ref }) => ref.get())
        .tap(({ fiber2 }) => fiber2.interrupt())

      const { result } = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("daemon fiber race interruption", async () => {
      function plus1<X>(latch: Promise<never, void>, finalizer: UIO<X>) {
        return (latch.succeed(undefined) > Effect.sleep(1000 * 60 * 60)).onInterrupt(
          () => finalizer.map((x) => x)
        )
      }

      const program = Effect.Do()
        .bind("interruptionRef", () => Ref.make(0))
        .bind("latch1Start", () => Promise.make<never, void>())
        .bind("latch2Start", () => Promise.make<never, void>())
        .bindValue("inc", ({ interruptionRef }) =>
          interruptionRef.updateAndGet((n) => n + 1)
        )
        .bindValue("left", ({ inc, latch1Start }) => plus1(latch1Start, inc))
        .bindValue("right", ({ inc, latch2Start }) => plus1(latch2Start, inc))
        .bind("fiber", ({ left, right }) => left.race(right).fork())
        .tap(
          ({ fiber, latch1Start, latch2Start }) =>
            latch1Start.await() > latch2Start.await() > fiber.interrupt()
        )
        .flatMap(({ interruptionRef }) => interruptionRef.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("race in daemon is executed", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bindValue("loser1", ({ latch1, promise1 }) =>
          Effect.acquireReleaseWith(
            latch1.succeed(undefined),
            () => Effect.never,
            () => promise1.succeed(undefined)
          )
        )
        .bindValue("loser2", ({ latch2, promise2 }) =>
          Effect.acquireReleaseWith(
            latch2.succeed(undefined),
            () => Effect.never,
            () => promise2.succeed(undefined)
          )
        )
        .bind("fiber", ({ loser1, loser2 }) => loser1.race(loser2).forkDaemon())
        .tap(({ latch1 }) => latch1.await())
        .tap(({ latch2 }) => latch2.await())
        .tap(({ fiber }) => fiber.interrupt())
        .bind("res1", ({ promise1 }) => promise1.await())
        .bind("res2", ({ promise2 }) => promise2.await())

      const { res1, res2 } = await program.unsafeRunPromise()

      expect(res1).toBeUndefined()
      expect(res2).toBeUndefined()
    })

    it("supervise fibers", async () => {
      function makeChild(n: number): RIO<HasClock, Fiber<never, void>> {
        return (Effect.sleep(20 * n) > Effect.never).fork()
      }

      const program = Ref.make(0)
        .tap((ref) =>
          (makeChild(1) > makeChild(2)).ensuringChildren((fs) =>
            fs.reduce(
              Effect.unit,
              (acc, fiber) => acc > fiber.interrupt() > ref.update((n) => n + 1)
            )
          )
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("race of fail with success", async () => {
      const program = Effect.fail(42).race(Effect.succeed(24)).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(24))
    })

    it("race of terminate with success", async () => {
      const program = Effect.die(new Error()).race(Effect.succeed(24))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(24)
    })

    it("race of fail with fail", async () => {
      const program = Effect.fail(42).race(Effect.fail(24)).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(42))
    })

    it("race of value and never", async () => {
      const program = Effect.succeed(42).race(Effect.never)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    // TODO(Mike/Max): test passes, but handle is left open from Effect.never
    it.skip("race in uninterruptible region", async () => {
      const program = Effect.unit.race(Effect.never).uninterruptible()

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("race of two forks does not interrupt winner", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("fibers", () => Ref.make(new Set<Fiber<any, any>>()))
        .bind("latch", () => Promise.make<never, void>())
        .bind("scope", () => Effect.descriptor.map((_) => _.scope))
        .bindValue("effect", ({ fibers, latch, ref, scope }) =>
          Effect.uninterruptibleMask(({ restore }) =>
            restore(latch.await().onInterrupt(() => ref.update((n) => n + 1)))
              .forkIn(scope)
              .tap((fiber) => fibers.update((set) => set.add(fiber)))
          )
        )
        .bindValue("awaitAll", ({ fibers }) =>
          fibers.get().flatMap((set) => Fiber.awaitAll(set))
        )
        .tap(({ effect }) => effect.race(effect))
        .flatMap(
          ({ awaitAll, latch, ref }) => latch.succeed(undefined) > awaitAll > ref.get()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBeLessThanOrEqual(1)
    })

    it("firstSuccessOf of values", async () => {
      const program = Effect.firstSuccessOf([
        Effect.fail(0),
        Effect.succeed(100)
      ]).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(100))
    })

    it("firstSuccessOf of failures", async () => {
      const program = Effect.firstSuccessOf([
        Effect.fail(0).delay(Duration(10)),
        Effect.fail(101)
      ]).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(101))
    })

    it("firstSuccessOf of failures & 1 success", async () => {
      const program = Effect.firstSuccessOf([
        Effect.fail(0),
        Effect.succeed(102).delay(Duration(1))
      ]).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(102))
    })

    it("raceFirst interrupts loser on success", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("effect", () => Promise.make<never, number>())
        .bindValue("winner", ({ promise }) =>
          Effect.fromEither(Either.right(undefined))
        )
        .bindValue("loser", ({ effect, promise }) =>
          Effect.acquireReleaseWith(
            promise.succeed(undefined),
            () => Effect.never,
            () => effect.succeed(42)
          )
        )
        .bindValue("race", ({ loser, winner }) => winner.raceFirst(loser))
        .tap(({ race }) => race)
        .flatMap(({ effect }) => effect.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("raceFirst interrupts loser on failure", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("effect", () => Promise.make<never, number>())
        .bindValue(
          "winner",
          ({ promise }) => promise.await() > Effect.fromEither(Either.left(new Error()))
        )
        .bindValue("loser", ({ effect, promise }) =>
          Effect.acquireReleaseWith(
            promise.succeed(undefined),
            () => Effect.never,
            () => effect.succeed(42)
          )
        )
        .bindValue("race", ({ loser, winner }) => winner.raceFirst(loser))
        .tap(({ race }) => race.either())
        .flatMap(({ effect }) => effect.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("mergeAll", async () => {
      const program = Effect.mergeAll(
        List("a", "aa", "aaa", "aaaa").map(Effect.succeedNow),
        0,
        (b, a) => b + a.length
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("mergeAll - empty", async () => {
      const program = Effect.mergeAll(List.empty<UIO<number>>(), 0, (b, a) => b + a)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("reduceAll", async () => {
      const program = Effect.reduceAll(
        Effect.succeed(1),
        List(2, 3, 4).map(Effect.succeedNow),
        (acc, a) => acc + a
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("reduceAll - empty list", async () => {
      const program = Effect.reduceAll(
        Effect.succeed(1),
        List.empty<UIO<number>>(),
        (acc, a) => acc + a
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("timeout of failure", async () => {
      const program = Effect.fail("uh oh").timeout(Duration.fromHours(1).milliseconds)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("uh oh"))
    })

    it("timeout of terminate", async () => {
      const program = Effect.die(ExampleError).timeout(
        Duration.fromHours(1).milliseconds
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })
  })

  describe("RTS option tests", () => {
    it("lifting a value to an option", async () => {
      const program = Effect.some(42)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(42))
    })

    it("using the none value", async () => {
      const program = Effect.none

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("RTS either helper tests", () => {
    it("lifting a value into right", async () => {
      const program = Effect.right(42)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(42))
    })

    it("lifting a value into left", async () => {
      const program = Effect.left(42)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(42))
    })
  })

  describe("RTS interruption", () => {
    it("sync forever is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.succeed(1).forever().fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interrupt of never is interrupted with cause", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.never.fork())
        .flatMap(({ fiber }) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.isInterruptedOnly()).toBe(true)
    })

    it("asyncEffect is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.asyncEffect(() => Effect.never).fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(() => 42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("async is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.async(constVoid).fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(() => 42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    // TODO(Mike/Max): test passes, but handle is left open from Effect.never
    it.skip("acquireReleaseWith is uninterruptible", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          Effect.acquireReleaseWith(
            promise.succeed(undefined) < Effect.never,
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon()
        )
        .flatMap(
          ({ fiber, promise }) =>
            promise.await() > fiber.interrupt().timeoutTo(42, () => 0, 1000)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    // TODO(Mike/Max): test passes, but handle is left open from Effect.never
    it.skip("acquireReleaseExitWith is uninterruptible", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          Effect.acquireReleaseWith(
            promise.succeed(undefined) > Effect.never > Effect.succeed(1),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon()
        )
        .flatMap(
          ({ fiber, promise }) =>
            promise.await() > fiber.interrupt().timeoutTo(42, () => 0, 1000)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("acquireReleaseWith use is interruptible", async () => {
      const program = Effect.unit
        .acquireReleaseWith(
          () => Effect.never,
          () => Effect.unit
        )
        .fork()
        .flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseExitWith use is interruptible", async () => {
      const program = Effect.acquireReleaseExitWith(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .fork()
        .flatMap((fiber) => fiber.interrupt().timeoutTo(42, () => 0, 1000))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseWith release called on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2 }) =>
          Effect.acquireReleaseWith(
            Effect.unit,
            () => promise1.succeed(undefined) > Effect.never,
            () => promise2.succeed(undefined) > Effect.unit
          ).fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ promise2 }) => promise2.await())
        .timeoutTo(42, () => 0, 1000)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseExitWith release called on interrupt", async () => {
      const program = Effect.Do()
        .bind("done", () => Promise.make<never, void>())
        .bind("fiber", ({ done }) =>
          withLatch((release) =>
            Effect.acquireReleaseExitWith(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            )
          ).fork()
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ done }) => done.await().timeoutTo(42, () => 0, 60000))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseWith acquire returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, number>())
        .bind("promise3", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2, promise3 }) =>
          (promise1.succeed(undefined) > promise2.await())
            .acquireReleaseWith(
              () => Effect.unit,
              () => promise3.await()
            )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .bind("result", ({ fiber }) => fiber.interrupt())
        .tap(({ promise3 }) => promise3.succeed(undefined))

      const { result } = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseExitWith disconnect acquire returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("promise3", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2, promise3 }) =>
          Effect.acquireReleaseExitWith(
            promise1.succeed(undefined) > promise2.await(),
            () => Effect.unit,
            () => promise3.await()
          )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .bind("result", ({ fiber }) => fiber.interrupt())
        .tap(({ promise3 }) => promise3.succeed(undefined))

      const { result } = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseWith disconnect use is interruptible", async () => {
      const program = Effect.unit
        .acquireReleaseWith(
          () => Effect.never,
          () => Effect.unit
        )
        .disconnect()
        .fork()
        .flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseExitWith disconnect use is interruptible", async () => {
      const program = Effect.acquireReleaseExitWith(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .disconnect()
        .fork()
        .flatMap((fiber) => fiber.interrupt().timeoutTo(42, () => 0, 1000))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseWith disconnect release called on interrupt in separate fiber", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2 }) =>
          Effect.acquireReleaseWith(
            Effect.unit,
            () => promise1.succeed(undefined) > Effect.never,
            () => promise2.succeed(undefined) > Effect.unit
          )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ promise2 }) => promise2.await())
        .timeoutTo(false, () => true, 10000)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("acquireReleaseExitWith disconnect release called on interrupt in separate fiber", async () => {
      const program = Effect.Do()
        .bind("done", () => Promise.make<never, void>())
        .bind("fiber", ({ done }) =>
          withLatch((release) =>
            Effect.acquireReleaseExitWith(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            )
              .disconnect()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ done }) => done.await().timeoutTo(false, () => true, 10000))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("catchAll + ensuring + interrupt", async () => {
      const program = Effect.Do()
        .bind("cont", () => Promise.make<never, void>())
        .bind("promise", () => Promise.make<never, boolean>())
        .bind("fiber", ({ cont, promise }) =>
          (cont.succeed(undefined) > Effect.never)
            .catchAll(Effect.failNow)
            .ensuring(promise.succeed(true))
            .fork()
        )
        .tap(({ cont }) => cont.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ promise }) => promise.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("finalizer can detect interruption", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, boolean>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2 }) =>
          (promise2.succeed(undefined) > Effect.never)
            .ensuring(
              Effect.descriptor.flatMap((descriptor) =>
                promise1.succeed(descriptor.interrupters.size > 0)
              )
            )
            .fork()
        )
        .tap(({ promise2 }) => promise2.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ promise1 }) => promise1.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interrupted cause persists after catching", async () => {
      function process(list: List<Exit<never, any>>): List<Exit<never, any>> {
        return list.map((exit) => exit.mapErrorCause((cause) => cause.untraced()))
      }

      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("exits", () => Ref.make(List<Exit<never, any>>()))
        .bind("fiber", ({ exits, latch1, latch2 }) =>
          Effect.uninterruptibleMask(({ restore }) =>
            restore(
              Effect.uninterruptibleMask(({ restore }) =>
                restore(latch1.succeed(undefined) > latch2.await()).onExit((exit) =>
                  exits.update((list) => list.prepend(exit))
                )
              ) > Effect.unit
            )
              .exit()
              .flatMap((exit) => exits.update((list) => list.prepend(exit)))
              .fork()
          )
        )
        .tap(({ fiber, latch1 }) => latch1.await() > fiber.interrupt())
        .flatMap(({ exits }) => exits.get().map(process))

      const result = await program.unsafeRunPromise()

      expect(result.length).toEqual(2)
      expect(
        result.reduce(
          true,
          (acc, curr) => acc && curr.isFailure() && curr.cause.isInterruptedOnly()
        )
      )
    })

    it("interruption of raced", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("cont1", () => Promise.make<never, void>())
        .bind("cont2", () => Promise.make<never, void>())
        .bindValue(
          "make",
          ({ ref }) =>
            (p: Promise<never, void>) =>
              (p.succeed(undefined) > Effect.never).onInterrupt(() =>
                ref.update((n) => n + 1)
              )
        )
        .bind("raced", ({ cont1, cont2, make }) => make(cont1).race(make(cont2)).fork())
        .tap(({ cont1, cont2 }) => cont1.await() > cont2.await())
        .tap(({ raced }) => raced.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("recovery of error in finalizer", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(false))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never)
              .ensuring(
                (Effect.unit > Effect.fail("uh oh")).catchAll(() => recovered.set(true))
              )
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("recovery of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(false))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .foldCauseEffect(
                (cause) => recovered.set(cause.isInterrupted()),
                () => recovered.set(false)
              )
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("sandbox of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(Option.emptyOf<Either<boolean, any>>()))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .sandbox()
              .either()
              .flatMap((either) =>
                recovered.set(
                  Option.some(either.mapLeft((cause) => cause.isInterrupted()))
                )
              )
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(Either.left(true)))
    })

    it("run of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(Option.emptyOf<boolean>()))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .exit()
              .flatMap((exit) => recovered.set(Option.some(exit.isInterrupted())))
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(true))
    })

    it("alternating interruptibility", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bind("fiber", ({ counter }) =>
          withLatch((release) =>
            (
              (
                release >
                Effect.never.interruptible().exit() >
                counter.update((n) => n + 1)
              )
                .uninterruptible()
                .interruptible()
                .exit() > counter.update((n) => n + 1)
            )
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ counter }) => counter.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("interruption after defect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (
              Effect.attempt(() => {
                throw new Error()
              }).exit() >
              release >
              Effect.never
            )
              .ensuring(ref.set(true))
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interruption after defect 2", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (
              Effect.attempt(() => {
                throw new Error()
              }).exit() >
              release >
              Effect.unit.forever()
            )
              .ensuring(ref.set(true))
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    // TODO(Mike/Max): test passes, but handle is left open from Effect.never
    it.skip("disconnect returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          (promise.succeed(undefined) > Effect.never)
            .ensuring(Effect.never)
            .disconnect()
            .fork()
        )
        .tap(({ promise }) => promise.await())
        .flatMap(({ fiber }) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("disconnected effect that is then interrupted eventually performs interruption", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2, ref }) =>
          (promise1.succeed(undefined) > Effect.never)
            .ensuring(ref.set(true) > Effect.sleep(10) > promise2.succeed(undefined))
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ promise2 }) => promise2.await())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("cause reflects interruption", async () => {
      const program = withLatch((release) =>
        (release > Effect.fail("foo")).fork()
      ).flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      const isInterruptedOnly = result.isFailure() && result.cause.isInterruptedOnly()
      if (isInterruptedOnly) {
        expect(isInterruptedOnly).toBe(true)
      } else {
        expect(result.untraced()).toEqual(Exit.fail("foo"))
      }
    })

    it("acquireRelease use inherits interrupt status", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatchAwait(
            (release2, await2) =>
              withLatch((release1) =>
                release1
                  .acquireRelease(
                    await2 > Effect.sleep(10) > ref.set(true),
                    Effect.unit
                  )
                  .uninterruptible()
                  .fork()
              ) < release2
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("acquireRelease use inherits interrupt status 2", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ latch1, latch2, ref }) =>
          latch1
            .succeed(undefined)
            .acquireReleaseWith(
              () => latch2.await() > Effect.sleep(10) > ref.set(true).asUnit(),
              () => Effect.unit
            )
            .uninterruptible()
            .fork()
        )
        .tap(({ latch1 }) => latch1.await())
        .tap(({ latch2 }) => latch2.succeed(undefined))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("async can be uninterruptible", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (release > Effect.sleep(10) > ref.set(true).asUnit())
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("closing scope is uninterruptible", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise", () => Promise.make<never, void>())
        .bindValue(
          "child",
          ({ promise, ref }) =>
            promise.succeed(undefined) > Effect.sleep(10) > ref.set(true)
        )
        .bindValue(
          "parent",
          ({ child, promise }) => child.uninterruptible().fork() > promise.await()
        )
        .bind("fiber", ({ parent }) => parent.fork())
        .tap(({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("effectAsyncInterrupt cancelation", async () => {
      const program = Effect.Do()
        .bind("ref", () => Effect.succeed(new AtomicNumber(0)))
        .bindValue("effect", ({ ref }) =>
          Effect.asyncInterrupt(() => {
            ref.incrementAndGet()
            return Either.left(Effect.succeed(ref.decrementAndGet()))
          })
        )
        .tap(({ effect }) => Effect.unit.race(effect))
        .flatMap(({ ref }) => Effect.succeed(ref.get))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })

  describe("RTS environment", () => {
    it("provide is modular", async () => {
      const program = Effect.Do()
        .bind("v1", () => Effect.service(NumberService))
        .bind("v2", () =>
          Effect.service(NumberService).provideEnvironment(NumberService.has({ n: 2 }))
        )
        .bind("v3", () => Effect.service(NumberService))
        .provideEnvironment(NumberService.has({ n: 4 }))

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      expect(v1.n).toBe(4)
      expect(v2.n).toBe(2)
      expect(v3.n).toBe(4)
    })

    it("async can use environment", async () => {
      const program = Effect.async<Has<NumberService>, never, number>((cb) =>
        cb(Effect.service(NumberService).map(({ n }) => n))
      ).provideEnvironment(NumberService.has({ n: 10 }))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })

  describe("RTS forking inheritability", () => {
    it("interruption status is heritable", async () => {
      const program = Effect.Do()
        .bind("latch", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(InterruptStatus.Interruptible))
        .tap(({ latch, ref }) =>
          (
            Effect.checkInterruptible(
              (interruptStatus) => ref.set(interruptStatus) > latch.succeed(undefined)
            ).fork() > latch.await()
          ).uninterruptible()
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(InterruptStatus.Uninterruptible)
    })
  })

  describe("serviceWith", () => {
    it("effectfully accesses a service in the environment", async () => {
      const program = Effect.serviceWithEffect(NumberService)(({ n }) =>
        Effect.succeed(n + 3)
      ).provideEnvironment(NumberService.has({ n: 0 }))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(3)
    })
  })

  describe("schedule", () => {
    it("runs effect for each recurrence of the schedule", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bindValue("effect", ({ ref }) =>
          Clock.currentTime.flatMap((n) => ref.update((list) => list.prepend(n)))
        )
        .bindValue(
          "schedule",
          () => Schedule.spaced(Duration(10)) && Schedule.recurs(5)
        )
        .tap(({ effect, schedule }) => effect.schedule(schedule))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result.length).toBe(5)
    })
  })

  describe("someOrElse", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.succeed(Option.some(1)).someOrElse(42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("falls back to the default value if None", async () => {
      const program = Effect.succeed(Option.none).someOrElse(42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("does not change failed state", async () => {
      const program = Effect.fail(ExampleError).someOrElse(42)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("someOrElseEffect", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.succeed(Option.some(1)).someOrElseEffect(
        Effect.succeed(42)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("falls back to the default effect if None", async () => {
      const program = Effect.succeed(Option.none).someOrElseEffect(Effect.succeed(42))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("does not change failed state", async () => {
      const program = Effect.fail(ExampleError).someOrElseEffect(Effect.succeed(42))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("someOrFail", () => {
    it("extracts the optional value", async () => {
      const program = Effect.succeed(Option.some(42)).someOrFail(ExampleError)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("fails when given a None", async () => {
      const program = Effect.succeed(Option.none).someOrFail(ExampleError)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("summarized", () => {
    it("returns summary and value", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bindValue("increment", ({ counter }) => counter.updateAndGet((n) => n + 1))
        .flatMap(({ increment }) =>
          increment.summarized(increment, (start, end) => Tuple(start, end))
        )

      const {
        tuple: [
          {
            tuple: [start, end]
          },
          value
        ]
      } = await program.unsafeRunPromise()

      expect(start).toBe(1)
      expect(value).toBe(2)
      expect(end).toBe(3)
    })
  })

  describe("tapErrorCause", () => {
    it("effectually peeks at the cause of the failure of this effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) =>
          Effect.dieMessage("die")
            .tapErrorCause(() => ref.set(true))
            .exit()
        )
        .bind("effect", ({ ref }) => ref.get())

      const { effect, result } = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
      expect(effect).toBe(true)
    })
  })

  describe("tapDefect", () => {
    it("effectually peeks at the cause of the failure of this effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) =>
          Effect.dieMessage("die")
            .tapDefect(() => ref.set(true))
            .exit()
        )
        .bind("effect", ({ ref }) => ref.get())

      const { effect, result } = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.dieOption().isSome()).toBe(true)
      expect(effect).toBe(true)
    })
  })

  describe("tapEither", () => {
    it("effectually peeks at the failure of this effect", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Effect.fail(42)
            .tapEither((either) =>
              either.fold(
                (n) => ref.set(n),
                () => ref.set(-1)
              )
            )
            .exit()
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("effectually peeks at the success of this effect", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Effect.succeed(42)
            .tapEither((either) =>
              either.fold(
                () => ref.set(-1),
                (n) => ref.set(n)
              )
            )
            .exit()
        )
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })

  describe("tapSome", () => {
    it("is identity if the function doesn't match", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) => ref.set(true).as(42).tapSome(Option.emptyOf))
        .bind("effect", ({ ref }) => ref.get())

      const { effect, result } = await program.unsafeRunPromise()

      expect(result).toBe(42)
      expect(effect).toBe(true)
    })

    it("runs the effect if the function matches", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("result", ({ ref }) =>
          ref
            .set(10)
            .as(42)
            .tapSome((n) => Option.some(ref.set(n)))
        )
        .bind("effect", ({ ref }) => ref.get())

      const { effect, result } = await program.unsafeRunPromise()

      expect(result).toBe(42)
      expect(effect).toBe(42)
    })
  })

  describe("timeout disconnect", () => {
    it("returns `Some` with the produced value if the effect completes before the timeout elapses", async () => {
      const program = Effect.unit.disconnect().timeout(100)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(undefined))
    })

    // TODO(Mike/Max): test passes, but handle is left open from Effect.never
    it.skip("returns `None` otherwise", async () => {
      const program = Effect.never
        .uninterruptible()
        .disconnect()
        .timeout(10)
        .fork()
        .tap(() => Effect.sleep(100))
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  // TODO(Mike/Max): fix failing test due to Jest timeout
  describe("transplant", () => {
    it.skip("preserves supervision relationship of nested fibers", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("fiber", ({ latch1, latch2 }) =>
          Effect.transplant((grafter) =>
            grafter(
              (latch1.succeed(undefined) > Effect.never)
                .onInterrupt(() => latch2.succeed(undefined))
                .fork()
                .flatMap(() => Effect.never)
                .map(constVoid)
                .fork()
            )
          )
        )
        .tap(({ latch1 }) => latch1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ latch2 }) => latch2.await())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("unleft", () => {
    it("should handle successes with right", async () => {
      const effect = Effect.succeed(Either.right(42))
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle successes with left", async () => {
      const effect = Effect.succeed(Either.left(42))
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle failures", async () => {
      const effect = Effect.fail(42)
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })
  })

  describe("unless", () => {
    it("executes correct branch only", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) => ref.set(1).unless(true))
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) => ref.set(2).unless(false))
        .bind("v2", ({ ref }) => ref.get())
        .bindValue("failure", () => new Error("expected"))
        .tap(({ failure }) => Effect.fail(failure).unless(true))
        .bind("failed", ({ failure }) => Effect.fail(failure).unless(false).either())

      const { failed, failure, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(0)
      expect(v2).toBe(2)
      expect(failed).toEqual(Either.left(failure))
    })
  })

  describe("unlessEffect", () => {
    it("executes condition effect and correct branch", async () => {
      const program = Effect.Do()
        .bind("effectRef", () => Ref.make(0))
        .bind("conditionRef", () => Ref.make(0))
        .bindValue("conditionTrue", ({ conditionRef }) =>
          conditionRef.update((n) => n + 1).as(true)
        )
        .bindValue("conditionFalse", ({ conditionRef }) =>
          conditionRef.update((n) => n + 1).as(false)
        )
        .tap(({ conditionTrue, effectRef }) =>
          effectRef.set(1).unlessEffect(conditionTrue)
        )
        .bind("v1", ({ effectRef }) => effectRef.get())
        .bind("c1", ({ conditionRef }) => conditionRef.get())
        .tap(({ conditionFalse, effectRef }) =>
          effectRef.set(2).unlessEffect(conditionFalse)
        )
        .bind("v2", ({ effectRef }) => effectRef.get())
        .bind("c2", ({ conditionRef }) => conditionRef.get())
        .bindValue("failure", () => new Error("expected"))
        .tap(({ conditionTrue, failure }) =>
          Effect.fail(failure).unlessEffect(conditionTrue)
        )
        .bind("failed", ({ conditionFalse, failure }) =>
          Effect.fail(failure).unlessEffect(conditionFalse).either()
        )

      const { c1, c2, failed, failure, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(0)
      expect(c1).toBe(1)
      expect(v2).toBe(2)
      expect(c2).toBe(2)
      expect(failed).toEqual(Either.left(failure))
    })
  })

  describe("unrefine", () => {
    it("converts some fiber failures into errors", async () => {
      const message = "division by zero"
      const defect = Effect.die(new IllegalArgumentException(message))
      const program = defect.unrefine((u) =>
        u instanceof IllegalArgumentException ? Option.some(u.message) : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(message))
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const program = defect.unrefine((u) =>
        u instanceof RuntimeError ? Option.some(u.message) : Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })
  })

  describe("unrefineWith", () => {
    it("converts some fiber failures into errors", async () => {
      const message = "division by zero"
      const defect = Effect.die(new IllegalArgumentException(message))
      const program = defect.unrefineWith(
        (u) =>
          u instanceof IllegalArgumentException ? Option.some(u.message) : Option.none,
        () => Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(message))
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const program = defect.unrefineWith(
        (u) => (u instanceof RuntimeError ? Option.some(u.message) : Option.none),
        () => Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("uses the specified function to convert the `E` into an `E1`", async () => {
      const failure = Effect.fail("fail")
      const program = failure.unrefineWith(
        (u) =>
          u instanceof IllegalArgumentException ? Option.some(u.message) : Option.none,
        () => Option.none
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.none))
    })
  })

  describe("unright", () => {
    it("should handle successes with right", async () => {
      const effect = Effect.succeed(Either.right(42))
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle successes with left", async () => {
      const effect = Effect.succeed(Either.left(42))
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle failures", async () => {
      const effect = Effect.fail(42)
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })
  })

  describe("unsandbox", () => {
    it("unwraps exception", async () => {
      const failure = Effect.fail(Cause.fail(new Error("fail")))
      const success = Effect.succeed(100)
      const program = Effect.Do()
        .bind("message", () =>
          failure.unsandbox().foldEffect(
            (e) => Effect.succeed(e.message),
            () => Effect.succeed("unexpected")
          )
        )
        .bind("result", () => success.unsandbox())

      const { message, result } = await program.unsafeRunPromise()

      expect(message).toBe("fail")
      expect(result).toBe(100)
    })

    it("no information is lost during composition", async () => {
      function cause<R, E>(effect: Effect<R, E, never>): Effect<R, never, Cause<E>> {
        return effect.foldCauseEffect(Effect.succeedNow, Effect.failNow)
      }
      const c = Cause.fail("oh no")
      const program = cause(
        Effect.failCause(c)
          .sandbox()
          .mapErrorCause((e) => e.untraced())
          .unsandbox()
      )

      const result = await program.unsafeRunPromise()

      expect(result.untraced()).toEqual(c)
    })
  })

  describe("updateService", () => {
    it("updates a service in the environment", async () => {
      const program = Effect.Do()
        .bind("a", () =>
          Effect.service(NumberService).updateService(NumberService)(({ n }) => ({
            n: n + 1
          }))
        )
        .bind("b", () => Effect.service(NumberService))
        .provideEnvironment(NumberService.has({ n: 0 }))

      const { a, b } = await program.unsafeRunPromise()

      expect(a.n).toBe(1)
      expect(b.n).toBe(0)
    })
  })

  describe("validate", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validate(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("accumulate errors and ignore successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validate(list, (n) =>
        n % 2 === 0 ? Effect.succeed(n) : Effect.fail(n)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 3, 5, 7, 9])
    })

    it("accumulate successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validate(list, Effect.succeedNow).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("fails", async () => {
      const program = Effect.succeed(1).validate(Effect.fail(2)).sandbox().either()

      const result = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.fail(2))
      )
    })

    it("combines both cause", async () => {
      const program = Effect.fail(1).validate(Effect.fail(2)).sandbox().either()

      const result = await program.unsafeRunPromise()

      expect(result.mapLeft((cause) => cause.untraced())).toEqual(
        Either.left(Cause.fail(1) + Cause.fail(2))
      )
    })
  })

  describe("validateDiscard", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validateDiscard(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })
  })

  describe("validatePar", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 1000)
      const program = Effect.validatePar(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("accumulate errors and ignore successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validatePar(list, (n) =>
        n % 2 === 0 ? Effect.succeed(n) : Effect.fail(n)
      ).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 3, 5, 7, 9])
    })

    it("accumulate successes", async () => {
      const list = List.range(0, 10)
      const program = Effect.validatePar(list, Effect.succeedNow).map((chunk) =>
        chunk.toArray()
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })
  })

  describe("validateParDiscard", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validateParDiscard(list, Effect.failNow).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })
  })

  describe("validateFirst", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 10)
      const program = Effect.validateFirst(list, Effect.failNow)
        .flip()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("runs sequentially and short circuits on first success validation", async () => {
      function f(n: number): IO<number, number> {
        return n === 6 ? Effect.succeed(n) : Effect.fail(n)
      }

      const list = List.range(1, 10)
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bind("result", ({ counter }) =>
          Effect.validateFirst(list, (n) => counter.update((n) => n + 1) > f(n))
        )
        .bind("count", ({ counter }) => counter.get())

      const { count, result } = await program.unsafeRunPromise()

      expect(result).toBe(6)
      expect(count).toBe(6)
    })

    it("returns errors in correct order", async () => {
      const list = List(2, 4, 6, 3, 5, 6)
      const program = Effect.validateFirst(list, Effect.failNow)
        .flip()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([2, 4, 6, 3, 5, 6])
    })
  })

  describe("validateFirstPar", () => {
    it("returns all errors if never valid", async () => {
      const list = List.repeat(0, 1000)
      const program = Effect.validateFirstPar(list, Effect.failNow)
        .flip()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.toArray())
    })

    it("returns success if valid", async () => {
      function f(n: number): IO<number, number> {
        return n === 6 ? Effect.succeed(n) : Effect.fail(n)
      }

      const list = List.range(1, 10)
      const program = Effect.validateFirstPar(list, f)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(6)
    })
  })

  describe("validateWith", () => {
    it("succeeds", async () => {
      const program = Effect.succeed(1).validateWith(Effect.succeed(2), (a, b) => a + b)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(3)
    })
  })

  describe("when", () => {
    it("executes correct branch only", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) => Effect.when(false, ref.set(1)))
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) => Effect.when(true, ref.set(2)))
        .bind("v2", ({ ref }) => ref.get())
        .bindValue("failure", () => new Error("expected"))
        .tap(({ failure }) => Effect.when(false, Effect.fail(failure)))
        .bind("failed", ({ failure }) =>
          Effect.when(true, Effect.fail(failure)).either()
        )

      const { failed, failure, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(0)
      expect(v2).toBe(2)
      expect(failed).toEqual(Either.left(failure))
    })
  })

  describe("whenCase", () => {
    it("executes correct branch only", async () => {
      const v1 = Option.emptyOf<number>()
      const v2 = Option.some(0)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Effect.whenCase(v1, (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res1", ({ ref }) => ref.get())
        .tap(({ ref }) =>
          Effect.whenCase(v2, (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res2", ({ ref }) => ref.get())

      const { res1, res2 } = await program.unsafeRunPromise()

      expect(res1).toBe(false)
      expect(res2).toBe(true)
    })
  })

  describe("whenCaseEffect", () => {
    it("executes condition effect and correct branch", async () => {
      const v1 = Option.emptyOf<number>()
      const v2 = Option.some(0)
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Effect.whenCaseEffect(Effect.succeed(v1), (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res1", ({ ref }) => ref.get())
        .tap(({ ref }) =>
          Effect.whenCaseEffect(Effect.succeed(v2), (option) =>
            option._tag === "Some" ? Option.some(ref.set(true)) : Option.none
          )
        )
        .bind("res2", ({ ref }) => ref.get())

      const { res1, res2 } = await program.unsafeRunPromise()

      expect(res1).toBe(false)
      expect(res2).toBe(true)
    })
  })

  describe("whenEffect", () => {
    it("executes condition effect and correct branch", async () => {
      const program = Effect.Do()
        .bind("effectRef", () => Ref.make(0))
        .bind("conditionRef", () => Ref.make(0))
        .bindValue("conditionTrue", ({ conditionRef }) =>
          conditionRef.update((n) => n + 1).as(true)
        )
        .bindValue("conditionFalse", ({ conditionRef }) =>
          conditionRef.update((n) => n + 1).as(false)
        )
        .tap(({ conditionFalse, effectRef }) =>
          Effect.whenEffect(conditionFalse, effectRef.set(1))
        )
        .bind("v1", ({ effectRef }) => effectRef.get())
        .bind("c1", ({ conditionRef }) => conditionRef.get())
        .tap(({ conditionTrue, effectRef }) =>
          Effect.whenEffect(conditionTrue, effectRef.set(2))
        )
        .bind("v2", ({ effectRef }) => effectRef.get())
        .bind("c2", ({ conditionRef }) => conditionRef.get())
        .bindValue("failure", () => new Error("expected"))
        .tap(({ conditionFalse, failure }) =>
          Effect.whenEffect(conditionFalse, Effect.fail(failure))
        )
        .bind("failed", ({ conditionTrue, failure }) =>
          Effect.whenEffect(conditionTrue, Effect.fail(failure)).either()
        )

      const { c1, c2, failed, failure, v1, v2 } = await program.unsafeRunPromise()

      expect(v1).toBe(0)
      expect(c1).toBe(1)
      expect(v2).toBe(2)
      expect(c2).toBe(2)
      expect(failed).toEqual(Either.left(failure))
    })
  })

  describe("zipFlatten", () => {
    it("is compositional", async () => {
      const program =
        Effect.succeed(1) + Effect.unit + Effect.succeed("test") + Effect.succeed(true)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Tuple(1, undefined, "test", true))
    })
  })

  describe("zipPar", () => {
    it("does not swallow exit causes of loser", async () => {
      const program = Effect.interrupt.zipPar(Effect.interrupt)

      const result = await program.unsafeRunPromiseExit()

      expect(
        result.causeOption().map((cause) => cause.interruptors().size > 0)
      ).toEqual(Option.some(true))
    })

    it("does not report failure when interrupting loser after it succeeded", async () => {
      const program = Effect.interrupt
        .zipPar(Effect.succeed(1))
        .sandbox()
        .either()
        .map((either) => either.mapLeft((cause) => cause.isInterrupted()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(true))
    })

    it("passes regression 1", async () => {
      const program = Effect.succeed(1)
        .zipPar(Effect.succeed(2))
        .flatMap((tuple) => Effect.succeed(tuple.get(0) + tuple.get(1)))
        .map((n) => n === 3)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("paralellizes simple success values", async () => {
      function countdown(n: number): UIO<number> {
        return n === 0
          ? Effect.succeed(0)
          : Effect.succeed(1)
              .zipPar(Effect.succeed(2))
              .flatMap((tuple) =>
                countdown(n - 1).map((y) => tuple.get(0) + tuple.get(1) + y)
              )
      }

      const result = await countdown(50).unsafeRunPromise()

      expect(result).toBe(150)
    })

    it("does not kill fiber when forked on parent scope", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("latch3", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(false))
        .bindValue("left", ({ latch1, latch2, latch3, ref }) =>
          Effect.uninterruptibleMask(
            ({ restore }) =>
              latch2.succeed(undefined) >
              restore(latch1.await() > Effect.succeed("foo")).onInterrupt(() =>
                ref.set(true)
              )
          )
        )
        .bindValue("right", ({ latch3 }) => latch3.succeed(undefined).as(42))
        .tap(({ latch1, latch2, latch3 }) =>
          (latch2.await() > latch3.await() > latch1.succeed(undefined)).fork()
        )
        .bind("result", ({ left, right }) => left.fork().zipPar(right))
        .bindValue("leftInnerFiber", ({ result }) => result.get(0))
        .bindValue("rightResult", ({ result }) => result.get(1))
        .bind("leftResult", ({ leftInnerFiber }) => leftInnerFiber.await())
        .bind("interrupted", ({ ref }) => ref.get())

      const { interrupted, leftResult, rightResult } = await program.unsafeRunPromise()

      expect(interrupted).toBe(false)
      expect(leftResult.untraced()).toEqual(Exit.succeed("foo"))
      expect(rightResult).toBe(42)
    })
  })

  describe("resurrect", () => {
    it("should fail checked", async () => {
      const error = new Error("fail")
      const program = Effect.fail(error).asUnit().orDie().resurrect().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(error))
    })
  })

  describe("options", () => {
    it("basic option test", async () => {
      const program = Effect.getOrFailDiscard(Option.some("foo"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("foo")
    })

    it("side effect unit in option test", async () => {
      const program = Effect.getOrFailDiscard(Option.none).catchAll(() =>
        Effect.succeed("controlling unit side-effect")
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("controlling unit side-effect")
    })
  })
})
