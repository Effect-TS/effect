export const CountdownLatchSym = Symbol.for("@effect/core/concurrent/CountdownLatch")
export type CountdownLatchSym = typeof CountdownLatchSym

/**
 * A synchronization aid that allows one or more fibers to wait until a set of
 * operations being performed in other fibers completes.
 *
 * A `CountDownLatch` is initialized with a given count. The `await` method
 * block until the current count reaches zero due to invocations of the
 * `countDown` method, after which all waiting fibers are released and any
 * subsequent invocations of `await` return immediately. This is a one-shot
 * phenomenon -- the count cannot be reset. If you need a version that resets
 * the count, consider using a `CyclicBarrier`.
 *
 * A `CountDownLatch` is a versatile synchronization tool and can be used for a
 * number of purposes. A `CountDownLatch` initialized with a count of one serves
 * as a simple on/off latch, or gate: all fibers invoking `await` wait at the
 * gate until it is opened by a fiber invoking `countDown`. A `CountDownLatch`
 * initialized to N can be used to make one fiber wait until N fibers have
 * completed some action, or some action has been completed N times.
 *
 * A useful property of a `CountDownLatch` is that it doesn't require that
 * fibers calling `countDown` wait for the count to reach zero before
 * proceeding, it simply prevents any fiber from proceeding past an `await`
 * until all fibers could pass.
 *
 * @tsplus type effect/core/concurrent/CountdownLatch
 */
export interface CountdownLatch extends CountdownLatchInternal {}

/**
 * @tsplus type effect/core/concurrent/CountdownLatch.Ops
 */
export interface CountdownLatchOps {
  readonly $: CountdownLatchAspects
}
export const CountdownLatch: CountdownLatchOps = {
  $: {}
}

/**
 * @tsplus type effect/core/concurrent/CountdownLatch.Aspects
 */
export interface CountdownLatchAspects {}

export class CountdownLatchInternal {
  readonly [CountdownLatchSym]: CountdownLatchSym = CountdownLatchSym

  private _count: Ref<number>
  private _waiters: Deferred<never, void>

  constructor(count: Ref<number>, waiters: Deferred<never, void>) {
    this._count = count
    this._waiters = waiters
  }

  /**
   * Returns the current count.
   */
  count(): Effect<never, never, number> {
    return this._count.get()
  }

  /**
   * Decrements the count of the latch, releasing all waiting fibers if the
   * count reaches zero.
   */
  countDown(): Effect<never, never, void> {
    return this._count.modify((n) => {
      if (n === 0) {
        return Tuple(Effect.unit, 0)
      }
      if (n === 1) {
        return Tuple(this._waiters.succeed(undefined), 0)
      }
      return Tuple(Effect.unit, n - 1)
    }).flatten.unit
  }

  /**
   * Causes the current fiber to wait until the latch has counted down to zero.
   */
  await(): Effect<never, never, void> {
    return this._waiters.await()
  }
}
