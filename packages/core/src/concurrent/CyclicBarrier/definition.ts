export const CyclicBarrierSym = Symbol.for("@effect/core/concurrent/CyclicBarrier")
export type CyclicBarrierSym = typeof CyclicBarrierSym

/**
 * A `CyclicBarrier` is a synchronization aid that allows a set of fibers to all
 * wait for each other to reach a common barrier point.
 *
 * `CyclicBarrier`s are useful in programs involving a fixed sized party of
 * fibers that must occasionally wait for each other. The barrier is called
 * cyclic because it can be re-used after the waiting fibers are released.
 *
 * A `CyclicBarrier` supports an optional action command that is run once per
 * barrier point, after the last fiber in the party arrives, but before any
 * fibers are released. This barrier action is useful for updating shared-state
 * before any of the parties continue.
 *
 * @tsplus type effect/core/concurrent/CyclicBarrier
 * @category model
 * @since 1.0.0
 */
export interface CyclicBarrier extends CyclicBarrierInternal {}

/**
 * @tsplus type effect/core/concurrent/CyclicBarrier.Ops
 * @category model
 * @since 1.0.0
 */
export interface CyclicBarrierOps {
  readonly $: CyclicBarrierAspects
}
export const CyclicBarrier: CyclicBarrierOps = {
  $: {}
}

/**
 * @tsplus type effect/core/concurrent/CyclicBarrier.Aspects
 * @category model
 * @since 1.0.0
 */
export interface CyclicBarrierAspects {}

/** @internal */
export class CyclicBarrierInternal {
  readonly [CyclicBarrierSym]: CyclicBarrierSym = CyclicBarrierSym

  private _parties: number
  private _waiting: Ref<number>
  private _lock: Ref<Deferred<void, void>>
  private _action: Effect<never, never, unknown>
  private _broken: Ref<boolean>

  constructor(
    parties: number,
    waiting: Ref<number>,
    lock: Ref<Deferred<void, void>>,
    action: Effect<never, never, unknown>,
    broken: Ref<boolean>
  ) {
    this._parties = parties
    this._waiting = waiting
    this._lock = lock
    this._action = action
    this._broken = broken
  }

  /**
   * The number of parties required to trip this barrier.
   */
  get parties(): number {
    return this._parties
  }

  /**
   * The number of parties currently waiting at the barrier.
   */
  get waiting(): Effect<never, never, number> {
    return this._waiting.get
  }

  /**
   * Queries if this barrier is in a broken state.
   */
  get isBroken(): Effect<never, never, boolean> {
    return this._broken.get
  }

  /**
   * Resets the barrier to its initial state. Breaks any waiting party.
   */
  get reset(): Effect<never, never, void> {
    return Effect.whenEffect(
      this._waiting.get.map((waiting) => waiting > 0),
      this.fail
    ).zipRight(
      Deferred.make<void, void>()
        .flatMap((deferred) => this._lock.set(deferred))
    )
      .zipRight(this._waiting.set(0))
      .zipRight(this._broken.set(false))
      .uninterruptible
  }

  /**
   * Waits until all parties have invoked await on this barrier. Fails if the
   * barrier is broken.
   */
  get await(): Effect<never, void, number> {
    return Effect.uninterruptibleMask(({ restore }) =>
      this._broken.get
        .flatMap((broken) => broken ? Effect.fail(undefined) : Effect.unit)
        .zipRight(
          this._waiting.modify((waiting) =>
            waiting + 1 === this._parties ?
              [
                restore(this._action)
                  .zipRight(this.succeed.as(this._parties - waiting - 1))
                  .zipLeft(this.reset),
                0
              ] as const :
              [
                this._lock.get.flatMap((lock) =>
                  restore(lock.await)
                    .onInterrupt(() => this.break)
                    .as(this._parties - waiting - 1)
                ),
                waiting + 1
              ] as const
          ).flatten
        )
    )
  }

  private get succeed(): Effect<never, never, void> {
    return this._lock.get.flatMap((deferred) => deferred.succeed(undefined).unit)
  }

  private get fail(): Effect<never, never, void> {
    return this._lock.get.flatMap((deferred) => deferred.fail(undefined).unit)
  }

  private get break(): Effect<never, never, void> {
    return this._broken.set(true).zipRight(this.fail)
  }
}
