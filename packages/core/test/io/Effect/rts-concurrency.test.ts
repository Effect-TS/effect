import { HashSet } from "../../../src/collection/immutable/HashSet"
import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import type { HasClock } from "../../../src/io/Clock"
import type { RIO, UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Fiber } from "../../../src/io/Fiber"
import { FiberId } from "../../../src/io/FiberId"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { withLatch } from "../../test-utils/Latch"
import { concurrentFib, ExampleError, fib } from "./test-utils"

describe("Effect", () => {
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
        .bind("result", ({ ref }) => ref.get)
        .tap(({ fiber2 }) => fiber2.interrupt())

      const { result } = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("daemon fiber race interruption", async () => {
      function plus1<X>(latch: Promise<never, void>, finalizer: UIO<X>) {
        return (
          latch.succeed(undefined) > Effect.sleep(Duration.fromHours(1))
        ).onInterrupt(() => finalizer.map((x) => x))
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
        .flatMap(({ interruptionRef }) => interruptionRef.get)

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
        return (Effect.sleep(Duration(20 * n)) > Effect.never).fork()
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
        .flatMap((ref) => ref.get)

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

    // FIXED: swapped out Effect.never for Promise
    it("race in uninterruptible region", async () => {
      const promise = Promise.unsafeMake<never, void>(FiberId.none)
      const program = Effect.unit.race(promise.await()).uninterruptible()

      const result = await program.unsafeRunPromise()
      await promise.succeed(undefined).unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it.only("race of two forks does not interrupt winner", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("fibers", () => Ref.make(HashSet.empty<Fiber<unknown, unknown>>()))
        .bind("latch", () => Promise.make<never, void>())
        .bindValue("effect", ({ fibers, latch, ref }) =>
          Effect.uninterruptibleMask(({ restore }) =>
            restore(latch.await().onInterrupt(() => ref.update((n) => n + 1)))
              .fork()
              .tap((fiber) => fibers.update((set) => set.add(fiber)))
          )
        )
        .bindValue("awaitAll", ({ fibers }) =>
          fibers.get.flatMap((set) => Fiber.awaitAll(set))
        )
        .tap(({ effect }) => effect.race(effect))
        .flatMap(
          ({ awaitAll, latch, ref }) => latch.succeed(undefined) > awaitAll > ref.get
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
      const program = Effect.fail("uh oh").timeout(Duration.fromHours(1))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("uh oh"))
    })

    it("timeout of terminate", async () => {
      const program = Effect.die(ExampleError).timeout(Duration.fromHours(1))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })
  })
})
