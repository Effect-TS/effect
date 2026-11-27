/**
 * Seeded `Scheduler` for finding races between fibers in tests.
 *
 * The default scheduler often runs short concurrent fibers one after another,
 * so races rarely show in tests. `TestScheduler` makes fibers yield at random
 * and runs their queued work in a seeded random order. The same seed replays
 * the same interleaving.
 *
 * @stability unstable
 * @since 4.1.7
 */
import type * as Fiber from "../Fiber.ts"
import { hashSeed, makeAttemptRandom } from "../internal/arbitrary/random.ts"
import { type IdleAware, whenIdle } from "../internal/testScheduler.ts"
import * as Layer from "../Layer.ts"
import * as Scheduler from "../Scheduler.ts"

/**
 * Options for {@link make} and {@link layer}.
 *
 * @stability unstable
 * @category options
 * @since 4.1.7
 */
export interface Options {
  /**
   * The seed that selects the interleaving.
   */
  readonly seed: number | string
  /**
   * The probability, from `0` to `1`, that a fiber yields before an operation.
   *
   * @default 0.1
   */
  readonly preempt?: number | undefined
}

/**
 * Creates a seeded scheduler that yields fibers at random operations and runs
 * their queued work in a random order.
 *
 * **Details**
 *
 * Each fiber keeps the default dispatcher, so one fiber's tasks still run by
 * priority and in FIFO order. Only the order of batches across fibers is
 * random: each host turn runs up to as many batches as were pending at its
 * start, drawing each from the current pool, including batches queued during
 * the turn. A fiber can be held back for several turns. With `preempt: 0`,
 * fibers yield only at the default operation budget, but batches are still
 * shuffled. For the default order, do not provide a `TestScheduler`.
 *
 * **Gotchas**
 *
 * - A scheduler holds random state. Use {@link layer} or a fresh `make` per run
 *   to replay a seed.
 * - Replay covers only work queued through the scheduler. Real timers, I/O and
 *   unseeded randomness break it, so use `TestClock` time and no real I/O.
 * - `Effect.yieldNow` does not let other fibers finish. Wait on a
 *   `Deferred`, a `Latch`, `Fiber.await`, or `TestClock.adjust` instead.
 *
 * @see {@link layer} for providing the scheduler to an effect
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.7
 */
export const make = (options: Options): Scheduler.Scheduler => new TestSchedulerImpl(options)

/**
 * Creates a `Layer` that provides a fresh {@link make} scheduler each time it
 * is built.
 *
 * **When to use**
 *
 * Use with `it.effect.prop` to run a test under many seeds, then replay a
 * failing seed as a plain test.
 *
 * **Example** (Finding a lost update)
 *
 * ```ts
 * import { assert, it } from "@effect/vitest"
 * import { Effect, Ref, Schema } from "effect"
 * import { TestScheduler } from "effect/testing"
 *
 * const increment = (ref: Ref.Ref<number>) =>
 *   Effect.gen(function*() {
 *     const n = yield* Ref.get(ref)
 *     yield* Ref.set(ref, n + 1)
 *   })
 *
 * const program = Effect.gen(function*() {
 *   const ref = yield* Ref.make(0)
 *   yield* Effect.all([increment(ref), increment(ref)], { concurrency: "unbounded" })
 *   return yield* Ref.get(ref)
 * })
 *
 * // Fails, reporting the seed that loses an update
 * it.effect.prop("never loses an update", [Schema.Int], ([seed]) =>
 *   Effect.gen(function*() {
 *     assert.strictEqual(yield* program, 2)
 *   }).pipe(Effect.provide(TestScheduler.layer({ seed }))))
 * ```
 *
 * @see {@link make} for the scheduler behavior and replay limits
 *
 * @stability unstable
 * @category layers
 * @since 4.1.7
 */
export const layer = (options: Options): Layer.Layer<never> => Layer.sync(Scheduler.Scheduler, () => make(options))

class TestSchedulerImpl implements Scheduler.Scheduler, IdleAware {
  readonly executionMode = "async"
  readonly nextUint32: () => number
  readonly threshold: number
  readonly base: Scheduler.MixedScheduler
  readonly host: (f: () => void) => () => void
  // Pending batches, at most one per dispatcher
  readonly pool: Array<() => void> = []
  readonly idleWaiters = new Set<() => void>()
  // A host turn is scheduled and has not finished
  scheduled = false

  constructor(options: Options) {
    this.nextUint32 = makeAttemptRandom(hashSeed(options.seed), 0).nextUint32
    this.threshold = (options.preempt ?? 0.1) * 0x100000000
    this.base = new Scheduler.MixedScheduler("async", this.enqueue)
    this.host = new Scheduler.MixedScheduler("async").setImmediate
  }

  shouldYield(fiber: Fiber.Fiber<unknown, unknown>): boolean {
    return this.base.shouldYield(fiber) || (this.threshold > 0 && this.nextUint32() < this.threshold)
  }

  makeDispatcher(): Scheduler.SchedulerDispatcher {
    return this.base.makeDispatcher()
  }

  [whenIdle](f: () => void): () => void {
    this.idleWaiters.add(f)
    this.schedule()
    return () => {
      this.idleWaiters.delete(f)
    }
  }

  readonly enqueue = (batch: () => void): () => void => {
    this.pool.push(batch)
    this.schedule()
    // Called by `flush`, which runs the batch synchronously
    return () => {
      const index = this.pool.indexOf(batch)
      if (index !== -1) this.pool.splice(index, 1)
    }
  }

  schedule(): void {
    if (this.scheduled) return
    this.scheduled = true
    this.host(this.run)
  }

  readonly run = (): void => {
    const pool = this.pool
    try {
      for (let n = pool.length; n > 0 && pool.length > 0; n--) {
        const index = Math.floor(this.nextUint32() * pool.length / 0x100000000)
        const batch = pool[index]
        pool[index] = pool[pool.length - 1]
        pool.pop()
        batch()
      }
    } finally {
      this.scheduled = false
      if (pool.length > 0) {
        this.schedule()
      } else if (this.idleWaiters.size > 0) {
        const waiters = Array.from(this.idleWaiters)
        this.idleWaiters.clear()
        for (const f of waiters) f()
      }
    }
  }
}
