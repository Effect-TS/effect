import { concurrentFib, ExampleError, fib } from "@effect/core/test/io/Effect/test-utils"
import { withLatch } from "@effect/core/test/test-utils/Latch"
import { DurationInternal } from "@tsplus/stdlib/data/Duration"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS concurrency correctness", () => {
    it("shallow fork/join identity", () =>
      Do(($) => {
        const result = $(Effect.sync(42).fork.flatMap((fiber) => fiber.join))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("deep fork/join identity", () =>
      Do(($) => {
        const result = $(concurrentFib(20))
        assert.strictEqual(result, fib(20))
      }).unsafeRunPromise())

    it("asyncEffect creation is interruptible", () =>
      Do(($) => {
        const release = $(Deferred.make<never, number>())
        const acquire = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.asyncEffect<never, unknown, unknown, never, unknown, unknown>((cb) =>
            // This will never complete because the callback is never invoked
            Effect.acquireUseRelease(
              acquire.succeed(undefined),
              () => Effect.never,
              () => release.succeed(42).unit
            )
          ).fork
        )
        $(acquire.await)
        $(fiber.interrupt)
        const result = $(release.await)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("daemon fiber is unsupervised", () =>
      Do(($) => {
        function child(ref: Ref<boolean>) {
          return withLatch((release) => (release > Effect.never).ensuring(ref.set(true)))
        }
        const ref = $(Ref.make(false))
        const fiber1 = $(child(ref).forkDaemon.fork)
        const fiber2 = $(fiber1.join)
        const result = $(ref.get)
        $(fiber2.interrupt)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("daemon fiber race interruption", () =>
      Do(($) => {
        function plus1<X>(latch: Deferred<never, void>, finalizer: Effect<never, never, X>) {
          return (
            latch.succeed(undefined) > Effect.sleep((1).hours)
          ).onInterrupt(() => finalizer.map((x) => x))
        }
        const interruptionRef = $(Ref.make(0))
        const latch1Start = $(Deferred.make<never, void>())
        const latch2Start = $(Deferred.make<never, void>())
        const inc = interruptionRef.updateAndGet((n) => n + 1)
        const left = plus1(latch1Start, inc)
        const right = plus1(latch2Start, inc)
        const fiber = $(left.race(right).fork)
        $(latch1Start.await.zipRight(latch2Start.await).zipRight(fiber.interrupt))
        const result = $(interruptionRef.get)
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("race in daemon is executed", () =>
      Do(($) => {
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const loser1 = Effect.acquireUseRelease(
          latch1.succeed(undefined),
          () => Effect.never,
          () => deferred1.succeed(undefined)
        )
        const loser2 = Effect.acquireUseRelease(
          latch2.succeed(undefined),
          () => Effect.never,
          () => deferred2.succeed(undefined)
        )
        const fiber = $(loser1.race(loser2).forkDaemon)
        $(latch1.await)
        $(latch2.await)
        $(fiber.interrupt)
        const res1 = $(deferred1.await)
        const res2 = $(deferred2.await)
        assert.isUndefined(res1)
        assert.isUndefined(res2)
      }).unsafeRunPromise())

    it("supervise fibers", () =>
      Do(($) => {
        function makeChild(n: number): Effect<never, never, Fiber<never, void>> {
          return (Effect.sleep(new DurationInternal(20 * n)) > Effect.never).fork
        }

        const ref = $(Ref.make(0))
        $(
          makeChild(1).zipRight(makeChild(2)).ensuringChildren((fs) =>
            fs.reduce(
              Effect.unit,
              (acc, fiber) => acc.zipRight(fiber.interrupt).zipRight(ref.update((n) => n + 1))
            )
          )
        )
        const result = $(ref.get)
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("race of fail with success", () =>
      Do(($) => {
        const result = $(Effect.failSync(42).race(Effect.sync(24)).either)
        assert.isTrue(result == Either.right(24))
      }).unsafeRunPromise())

    it("race of terminate with success", () =>
      Do(($) => {
        const result = $(Effect.dieSync(new Error()).race(Effect.sync(24)))
        assert.strictEqual(result, 24)
      }).unsafeRunPromise())

    it("race of fail with fail", () =>
      Do(($) => {
        const result = $(Effect.failSync(42).race(Effect.failSync(24)).either)
        assert.isTrue(result == Either.left(42))
      }).unsafeRunPromise())

    it("race of value and never", () =>
      Do(($) => {
        const result = $(Effect.sync(42).race(Effect.never))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("race in uninterruptible region", async () => {
      const deferred = Deferred.unsafeMake<never, void>(FiberId.none)
      await Do(($) => {
        const result = $(Effect.unit.race(deferred.await).uninterruptible)
        assert.isUndefined(result)
      }).unsafeRunPromise()
      await deferred.succeed(undefined).unsafeRunPromise()
    })

    it("race of two forks does not interrupt winner", () => {
      function forkWaiter(
        interrupted: Ref<number>,
        latch: Deferred<never, void>,
        done: Deferred<never, void>
      ) {
        return Effect.uninterruptibleMask((mask) =>
          mask.restore(latch.await)
            .onInterrupt(() => interrupted.update(_ => _ + 1) > done.succeed(void 0))
            .fork
        )
      }

      return Do(($) => {
        const interrupted = $(Ref.make(0))
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const done1 = $(Deferred.make<never, void>())
        const done2 = $(Deferred.make<never, void>())
        const forkWaiter1 = forkWaiter(interrupted, latch1, done1)
        const forkWaiter2 = forkWaiter(interrupted, latch2, done2)
        $(forkWaiter1.race(forkWaiter2))
        const count = $(latch1.succeed(void 0) > done1.await > done2.await > interrupted.get)
        assert.equal(count, 2)
      }).unsafeRunPromise()
    })

    it("firstSuccessOf of values", () =>
      Do(($) => {
        const result = $(
          Effect.firstSuccessOf([
            Effect.failSync(0),
            Effect.sync(100)
          ]).either
        )
        assert.isTrue(result == Either.right(100))
      }).unsafeRunPromise())

    it("firstSuccessOf of failures", () =>
      Do(($) => {
        const result = $(
          Effect.firstSuccessOf([
            Effect.failSync(0).delay((10).millis),
            Effect.failSync(101)
          ]).either
        )
        assert.isTrue(result == Either.left(101))
      }).unsafeRunPromise())

    it("firstSuccessOf of failures & 1 success", () =>
      Do(($) => {
        const result = $(
          Effect.firstSuccessOf([
            Effect.failSync(0),
            Effect.sync(102).delay((1).millis)
          ]).either
        )
        assert.isTrue(result == Either.right(102))
      }).unsafeRunPromise())

    it("raceFirst interrupts loser on success", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const effect = $(Deferred.make<never, number>())
        const winner = Effect.fromEither(Either.right(undefined))
        const loser = Effect.acquireUseRelease(
          deferred.succeed(undefined),
          () => Effect.never,
          () => effect.succeed(42)
        )
        $(winner.raceFirst(loser))
        const result = $(effect.await)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("raceFirst interrupts loser on failure", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const effect = $(Deferred.make<never, number>())
        const winner = deferred.await.zipRight(Effect.fromEither(Either.left(new Error())))
        const loser = Effect.acquireUseRelease(
          deferred.succeed(undefined),
          () => Effect.never,
          () => effect.succeed(42)
        )
        $(winner.raceFirst(loser).either)
        const result = $(effect.await)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("mergeAll", () =>
      Do(($) => {
        const result = $(Effect.mergeAll(
          List("a", "aa", "aaa", "aaaa").map(Effect.succeed),
          0,
          (b, a) => b + a.length
        ))
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("mergeAll - empty", () =>
      Do(($) => {
        const result = $(
          Effect.mergeAll(List.empty<Effect<never, never, number>>(), 0, (b, a) => b + a)
        )
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("reduceAll", () =>
      Do(($) => {
        const result = $(Effect.reduceAll(
          Effect.sync(1),
          List(2, 3, 4).map(Effect.succeed),
          (acc, a) => acc + a
        ))
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("reduceAll - empty list", () =>
      Do(($) => {
        const result = $(Effect.reduceAll(
          Effect.sync(1),
          List.empty<Effect<never, never, number>>(),
          (acc, a) => acc + a
        ))
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("timeout of failure", () =>
      Do(($) => {
        const result = $(Effect.failSync("uh oh").timeout((1).hours).exit)
        assert.isTrue(result == Exit.fail("uh oh"))
      }).unsafeRunPromiseExit())

    it("timeout of terminate", () =>
      Do(($) => {
        const result = $(Effect.dieSync(ExampleError).timeout((1).hours).exit)
        assert.isTrue(result == Exit.die(ExampleError))
      }).unsafeRunPromiseExit())
  })
})
