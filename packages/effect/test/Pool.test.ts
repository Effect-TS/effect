import { Deferred, Duration, Effect, Exit, Fiber, Option, Pool, Ref, Scope, TestClock, TestServices } from "effect"
import { assert, describe, expect, it } from "effect/test/utils/extend"

describe("Pool", () => {
  it.scoped("preallocates pool items", () =>
    Effect.gen(function*() {
      const count = yield* Ref.make(0)
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      yield* Pool.make({ acquire: get, size: 10 })
      yield* Effect.repeat(Ref.get(count), { until: (n) => n === 10 })
      const result = yield* Ref.get(count)
      assert.strictEqual(result, 10)
    }))

  // it.scoped("benchmark", () =>
  //   Effect.gen(function*() {
  //     const get = Effect.succeed("resource")
  //     const pool = yield* Pool.make({ acquire: get, size: 10 })
  //     yield* Pool.get(pool).pipe(
  //       Effect.scoped,
  //       Effect.repeatN(10000),
  //       Console.withTime("Pool.get")
  //     )
  //   }))

  it.scoped("cleans up items when shut down", () =>
    Effect.gen(function*() {
      const count = yield* Ref.make(0)
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const scope = yield* Scope.make()
      yield* Scope.extend(Pool.make({ acquire: get, size: 10 }), scope)
      yield* Effect.repeat(Ref.get(count), { until: (n) => n === 10 })
      yield* Scope.close(scope, Exit.succeed(void 0))
      const result = yield* Ref.get(count)
      assert.strictEqual(result, 0)
    }))

  it.scoped("defects don't prevent cleanup", () =>
    Effect.gen(function*() {
      const count = yield* Ref.make(0)
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Effect.zipRight(Ref.update(count, (n) => n - 1), Effect.die("boom"))
      )
      const scope = yield* Scope.make()
      yield* Scope.extend(Pool.make({ acquire: get, size: 10 }), scope)
      yield* Effect.repeat(Ref.get(count), { until: (n) => n === 10 })
      yield* Scope.close(scope, Exit.succeed(void 0))
      const result = yield* Ref.get(count)
      assert.strictEqual(result, 0)
    }))

  it.scoped("acquire one item", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 10 }))
      const item = yield* $(Pool.get(pool))
      assert.strictEqual(item, 1)
    }))

  it.scoped("reports failures via get", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Effect.flatMap(
          Ref.updateAndGet(count, (n) => n + 1),
          Effect.fail
        ),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 10 }))
      const values = yield* $(Effect.all(Effect.replicate(9)(Effect.flip(Pool.get(pool)))))
      expect(Array.from(values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    }))

  it.scoped("blocks when item not available", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 10 }))
      yield* $(Effect.all(Effect.replicate(10)(Pool.get(pool))))
      const result = yield* $(TestServices.provideLive(
        Effect.scoped(Pool.get(pool)).pipe(
          Effect.disconnect,
          Effect.timeout(Duration.millis(1)),
          Effect.option
        )
      ))
      expect(result).toEqual(Option.none())
    }))

  it.scoped("reuse released items", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeatN(99)(Effect.scoped(Pool.get(pool))))
      const result = yield* $(Ref.get(count))
      expect(result).toBe(10)
    }))

  it.scoped("invalidate item", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 10 }))
      yield* $(Pool.invalidate(pool, 1))
      const result = yield* $(Effect.scoped(Pool.get(pool)))
      const value = yield* $(Ref.get(count))
      expect(result).toBe(2)
      expect(value).toBe(10)
    }))

  it.scoped("invalidate all items in pool and check that pool.get doesn't hang forever", () =>
    Effect.gen(function*($) {
      const allocated = yield* $(Ref.make(0))
      const finalized = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(allocated, (n) => n + 1),
        () => Ref.update(finalized, (n) => n + 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 2 }))
      yield* $(Effect.repeat(Ref.get(allocated), { until: (n) => n === 2 }))
      yield* $(Pool.invalidate(pool, 1))
      yield* $(Pool.invalidate(pool, 2))
      const result = yield* $(Effect.scoped(Pool.get(pool)))
      const allocatedCount = yield* $(Ref.get(allocated))
      const finalizedCount = yield* $(Ref.get(finalized))
      expect(result).toBe(3)
      expect(allocatedCount).toBe(4)
      expect(finalizedCount).toBe(2)
    }))

  it.scoped("retry on failed acquire should not exhaust pool", () =>
    Effect.gen(function*($) {
      const acquire = Effect.as(Effect.fail("error"), 1)
      const pool = yield* $(Pool.makeWithTTL({ acquire, min: 0, max: 1, timeToLive: Duration.infinity }))
      const result = yield* $(
        Effect.scoped(Effect.retry(Pool.get(pool), { times: 5 })),
        Effect.timeoutFail({
          onTimeout: () => "timeout",
          duration: Duration.seconds(1)
        }),
        Effect.flip,
        TestServices.provideLive
      )
      expect(result).toBe("error")
    }))

  it.scoped("compositional retry", () =>
    Effect.gen(function*($) {
      const cond = (i: number) => (i <= 10 ? Effect.fail(i) : Effect.succeed(i))
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1).pipe(
          Effect.flatMap(cond)
        ),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 10 }))
      const result = yield* $(Effect.eventually(Effect.scoped(Pool.get(pool))))
      expect(result).toBe(11)
    }))

  it.scoped("max pool size", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<void>())
      const count = yield* $(Ref.make(0))
      const acquire = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.makeWithTTL({
        acquire,
        min: 10,
        max: 15,
        timeToLive: Duration.seconds(60)
      }))
      yield* $(
        Effect.scoped(Effect.zipRight(
          Pool.get(pool),
          Deferred.await(deferred)
        )),
        Effect.fork,
        Effect.repeatN(14)
      )
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 15 }))
      yield* $(Deferred.succeed(deferred, void 0))
      const max = yield* $(Ref.get(count))
      yield* $(TestClock.adjust(Duration.seconds(60)))
      const min = yield* $(Ref.get(count))
      expect(min).toBe(10)
      expect(max).toBe(15)
    }))

  it.scoped("max pool size with concurrency: 3", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<void>())
      const count = yield* $(Ref.make(0))
      const acquire = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.makeWithTTL({
        acquire,
        min: 10,
        max: 15,
        concurrency: 3,
        timeToLive: Duration.seconds(60)
      }))
      yield* $(
        Effect.scoped(Effect.zipRight(
          Pool.get(pool),
          Deferred.await(deferred)
        )),
        Effect.fork,
        Effect.repeatN(14 * 3)
      )
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 15 }))
      yield* $(Deferred.succeed(deferred, void 0))
      const max = yield* $(Ref.get(count))
      yield* $(TestClock.adjust(Duration.seconds(60)))
      const min = yield* $(Ref.get(count))
      expect(min).toBe(10)
      expect(max).toBe(15)
    }))

  it.scoped("concurrency reclaim", () =>
    Effect.gen(function*() {
      const count = yield* Ref.make(0)
      const acquire = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* Pool.makeWithTTL({
        acquire,
        min: 0,
        max: 2,
        concurrency: 2,
        timeToLive: Duration.seconds(60)
      })

      const scope1 = yield* Scope.make()
      yield* Scope.extend(Pool.get(pool), scope1)
      yield* Pool.get(pool)
      yield* Effect.scoped(Pool.get(pool))
      yield* TestClock.adjust(Duration.seconds(60))
      yield* Scope.close(scope1, Exit.void)
      yield* Pool.get(pool)
      yield* Pool.get(pool)
      assert.strictEqual(yield* Pool.get(pool), 1)
      assert.strictEqual(yield* Ref.get(count), 2)
    }))

  it.scoped("scale to zero", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<void>())
      const count = yield* $(Ref.make(0))
      const acquire = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const pool = yield* $(Pool.makeWithTTL({
        acquire,
        min: 0,
        max: 10,
        concurrency: 3,
        timeToLive: Duration.seconds(60)
      }))
      yield* $(
        Effect.scoped(Effect.zipRight(
          Pool.get(pool),
          Deferred.await(deferred)
        )),
        Effect.fork,
        Effect.repeatN(29)
      )
      yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 10 }))
      yield* $(Deferred.succeed(deferred, void 0))
      const max = yield* $(Ref.get(count))
      yield* $(TestClock.adjust(Duration.seconds(60)))
      const min = yield* $(Ref.get(count))
      expect(min).toBe(0)
      expect(max).toBe(10)
    }))

  it.scoped("max pool size creation strategy", () =>
    Effect.gen(function*($) {
      const invalidated = yield* $(Ref.make(0))
      const acquire = Effect.acquireRelease(
        Effect.succeed("resource"),
        () => Ref.update(invalidated, (n) => n + 1)
      )
      const pool = yield* $(Pool.makeWithTTL({
        acquire,
        min: 10,
        max: 15,
        timeToLive: Duration.seconds(60),
        timeToLiveStrategy: "creation"
      }))
      const scope = yield* Scope.make()
      yield* Pool.get(pool).pipe(
        Effect.repeatN(14),
        Scope.extend(scope)
      )
      const one = yield* $(Ref.get(invalidated))
      yield* $(TestClock.adjust(Duration.seconds(60)))
      const two = yield* $(Ref.get(invalidated))
      yield* Scope.close(scope, Exit.void)
      const three = yield* $(Ref.get(invalidated))
      assert.strictEqual(one, 0)
      assert.strictEqual(two, 0)
      assert.strictEqual(three, 15)
    }))

  it.scoped("shutdown robustness", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const scope = yield* $(Scope.make())
      const pool = yield* $(Scope.extend(Pool.make({ acquire: get, size: 10 }), scope))
      yield* $(
        Effect.scoped(Pool.get(pool)),
        Effect.fork,
        Effect.repeatN(99)
      )
      yield* $(Scope.close(scope, Exit.succeed(void 0)))
      const result = yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 0 }))
      expect(result).toBe(0)
    }))

  it.scoped("shutdown with pending takers", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const scope = yield* $(Scope.make())
      const pool = yield* $(Scope.extend(Pool.make({ acquire: get, size: 10 }), scope))
      yield* $(
        Pool.get(pool),
        Scope.extend(scope),
        Effect.fork,
        Effect.repeatN(99)
      )
      yield* $(Scope.close(scope, Exit.succeed(void 0)))
      const result = yield* $(Effect.repeat(Ref.get(count), { until: (n) => n === 0 }))
      expect(result).toBe(0)
    }))

  it.scoped("get is interruptible", () =>
    Effect.gen(function*($) {
      const count = yield* $(Ref.make(0))
      const get = Effect.acquireRelease(
        Ref.updateAndGet(count, (n) => n + 1),
        () => Ref.update(count, (n) => n - 1)
      )
      const fiberId = yield* $(Effect.fiberId)
      const pool = yield* $(Pool.make({ acquire: get, size: 10 }))
      yield* $(Effect.repeatN(Pool.get(pool), 9))
      const fiber = yield* $(Effect.fork(Pool.get(pool)))
      const result = yield* $(Fiber.interrupt(fiber))
      expect(result).toEqual(Exit.interrupt(fiberId))
    }))

  it.scoped("get is interruptible with dynamic size", () =>
    Effect.gen(function*($) {
      const get = Effect.never.pipe(Effect.forkScoped)
      const fiberId = yield* $(Effect.fiberId)
      const pool = yield* $(Pool.makeWithTTL({ acquire: get, min: 0, max: 10, timeToLive: Duration.infinity }))
      yield* $(Effect.repeatN(Pool.get(pool), 9))
      const fiber = yield* $(Effect.fork(Pool.get(pool)))
      const result = yield* $(Fiber.interrupt(fiber))
      expect(result).toEqual(Exit.interrupt(fiberId))
    }))

  it.scoped("finalizer is called for failed allocations", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const allocations = yield* Ref.make(0)
      const released = yield* Ref.make(0)
      const get = Effect.acquireRelease(
        Ref.updateAndGet(allocations, (n) => n + 1),
        () => Ref.update(released, (n) => n + 1)
      ).pipe(
        Effect.andThen(Effect.fail("boom"))
      )
      const pool = yield* Pool.make({ acquire: get, size: 10 }).pipe(
        Scope.extend(scope)
      )
      yield* Effect.scoped(pool.get).pipe(
        Effect.ignore
      )
      yield* Scope.close(scope, Exit.void)
      expect(yield* Ref.get(allocations)).toBe(11)
      expect(yield* Ref.get(released)).toBe(11)
    }))

  it.scoped("is subtype of Effect", () =>
    Effect.gen(function*() {
      const pool = yield* Pool.make({
        acquire: Effect.succeed(1),
        size: 1
      })
      const item = yield* pool
      assert.strictEqual(item, 1)
    }))
})
