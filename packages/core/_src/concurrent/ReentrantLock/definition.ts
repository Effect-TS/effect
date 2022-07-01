export const ReentrantLockSym = Symbol.for("@effect/core/concurrent/ReentrantLock")
export type ReentrantLockSym = typeof ReentrantLockSym

/**
 * @tsplus type effect/core/concurrent/ReentrantLock
 */
export interface ReentrantLock extends ReentrantLockInternal {}

/**
 * @tsplus type effect/core/concurrent/ReentrantLock.Ops
 */
export interface ReentrantLockOps {
  readonly $: ReentrantLockAspects
}
export const ReentrantLock: ReentrantLockOps = {
  $: {}
}

/**
 * @tsplus type effect/core/concurrent/ReentrantLock.Aspects
 */
export interface ReentrantLockAspects {}

export class ReentrantLockInternal {
  readonly [ReentrantLockSym]: ReentrantLockSym = ReentrantLockSym

  private _fairness: boolean
  private _state: Ref<ReentrantLockState>

  constructor(fairness: boolean, state: Ref<ReentrantLockState>) {
    this._fairness = fairness
    this._state = state
  }

  /**
   * Queries whether the given fiber is waiting to acquire this lock.
   */
  hasQueuedFiber(fiberId: FiberId): Effect<never, never, boolean> {
    return this._state.get().map((state) => state.waiters.has(fiberId))
  }

  /**
   * Queries whether any fibers are waiting to acquire this lock.
   */
  get hasQueuedFibers(): Effect<never, never, boolean> {
    return this._state.get().map((state) => !state.waiters.isEmpty)
  }

  /**
   * Queries the number of holds on this lock by the current fiber.
   */
  get holdCount(): Effect<never, never, number> {
    return Effect.fiberId.flatMap((fiberId) =>
      this._state.get().map((state) =>
        state.holder.isSome() && state.holder.value == fiberId ?
          state.holdCount :
          0
      )
    )
  }

  /**
   * Returns true if this lock has fairness set to true.
   */
  get isFair(): boolean {
    return this._fairness
  }

  get isHeldByCurrentFiber(): Effect<never, never, boolean> {
    return Effect.fiberId.flatMap((fiberId) =>
      this._state.get().map((state) => state.holder.isSome() && state.holder.value == fiberId)
    )
  }

  /**
   * Acquires the lock.
   *
   * Acquires the lock if it is not held by another fiber and returns
   * immediately, setting the lock hold count to one.
   *
   * If the current fiber already holds the lock then the hold count is
   * incremented by one and the method returns immediately.
   *
   * If the lock is held by another fiber then the current fiber is put to sleep
   * until the lock has been acquired, at which time the lock hold count is set
   * to one.
   */
  get lock(): Effect<never, never, void> {
    return Do(($) => {
      const fiberId = $(Effect.fiberId)
      const deferred = $(Deferred.make<never, void>())
      return $(
        this._state.modify((state) => {
          if (state.holder.isNone()) {
            return Tuple(
              Effect.unit,
              new ReentrantLockState(
                state.epoch + 1,
                Maybe.some(fiberId),
                1,
                HashMap.empty()
              )
            )
          }
          if (state.holder.isSome() && state.holder.value == fiberId) {
            return Tuple(
              Effect.unit,
              new ReentrantLockState(
                state.epoch + 1,
                Maybe.some(fiberId),
                state.holdCount + 1,
                state.waiters
              )
            )
          }
          return Tuple(
            deferred.await().onInterrupt(() => this.cleanupWaiter(fiberId)).unit,
            new ReentrantLockState(
              state.epoch + 1,
              state.holder,
              state.holdCount,
              state.waiters.set(fiberId, Tuple(state.epoch, deferred))
            )
          )
        }).flatten
      )
    })
  }

  /**
   * Queries if this lock is held by any fiber.
   */
  get locked(): Effect<never, never, boolean> {
    return this._state.get().map((state) => state.holder.isSome())
  }

  /**
   * Returns the `FiberId` of the fiber that currently owns this lock, if owned,
   * or `None` otherwise.
   */
  get owner(): Effect<never, never, Maybe<FiberId>> {
    return this._state.get().map((state) => state.holder)
  }

  /**
   * Returns the `FiberId`s of the fibers that are waiting to acquire this lock.
   */
  get queuedFibers(): Effect<never, never, List<FiberId>> {
    return this._state.get().map((state) => List.from([...state.waiters.keys]))
  }

  /**
   * Returns the number of fibers waiting to acquire this lock.
   */
  get queueLength(): Effect<never, never, number> {
    return this._state.get().map((state) => state.waiters.size)
  }

  /**
   * Acquires the lock only if it is not held by another fiber at the time of
   * invocation.
   */
  get tryLock(): Effect<never, never, boolean> {
    return Effect.fiberId.flatMap((fiberId) =>
      this._state.modify((state) => {
        if (state.holder.isSome() && state.holder.value == fiberId) {
          return Tuple(
            true,
            new ReentrantLockState(
              state.epoch + 1,
              Maybe.some(fiberId),
              state.holdCount + 1,
              state.waiters
            )
          )
        }
        if (state.holder.isNone()) {
          return Tuple(
            true,
            new ReentrantLockState(
              state.epoch + 1,
              Maybe.some(fiberId),
              1,
              state.waiters
            )
          )
        }
        return Tuple(false, state)
      })
    )
  }

  /**
   * Attempts to release this lock.
   *
   * If the current fiber is the holder of this lock then the hold count is
   * decremented. If the hold count is now zero then the lock is released. If
   * the current thread is not the holder of this lock then nothing happens.
   */
  get unlock(): Effect<never, never, void> {
    return Effect.fiberId.flatMap((fiberId) =>
      this._state.modify((state) => {
        if (state.holder.isSome() && state.holder.value == fiberId) {
          if (state.holdCount === 1) {
            return this.relock(state.epoch, state.waiters)
          }
          return Tuple(
            Effect.unit,
            new ReentrantLockState(
              state.epoch,
              Maybe.some(fiberId),
              state.holdCount - 1,
              state.waiters
            )
          )
        }
        return Tuple(Effect.unit, state)
      }).flatten
    )
  }

  /**
   * Acquires and releases the lock as a scoped effect.
   */
  get withLock(): Effect<Scope, never, number> {
    return Effect.acquireReleaseInterruptible(
      this.lock.zipRight(this.holdCount),
      this.unlock
    )
  }

  private relock(
    epoch: number,
    holders: HashMap<FiberId, Tuple<[number, Deferred<never, void>]>>
  ): Tuple<[Effect<never, never, void>, ReentrantLockState]> {
    if (holders.isEmpty) {
      return Tuple(
        Effect.unit,
        new ReentrantLockState(
          epoch + 1,
          Maybe.none,
          0,
          HashMap.empty()
        )
      )
    }
    const { tuple: [fiberId, { tuple: [_, deferred] }] } = this._fairness
      ? this.minHolder(holders)
      : this.pickRandom(holders)
    return Tuple(
      deferred.succeed(undefined).unit,
      new ReentrantLockState(
        epoch + 1,
        Maybe.some(fiberId),
        1,
        holders.remove(fiberId)
      )
    )
  }

  private pickRandom(
    holders: HashMap<FiberId, Tuple<[number, Deferred<never, void>]>>
  ): Tuple<[FiberId, Tuple<[number, Deferred<never, void>]>]> {
    const n = Math.floor(Math.random() * holders.size)
    return Array.from(holders)[n]!
  }

  private cleanupWaiter(fiberId: FiberId): Effect<never, never, unknown> {
    return this._state.update((state) =>
      new ReentrantLockState(
        state.epoch,
        state.holder,
        state.holdCount,
        state.waiters.remove(fiberId)
      )
    )
  }

  private minHolder(
    holders: HashMap<FiberId, Tuple<[number, Deferred<never, void>]>>
  ): Tuple<[FiberId, Tuple<[number, Deferred<never, void>]>]> {
    let min: number | undefined
    let minElem: Tuple<[FiberId, Tuple<[number, Deferred<never, void>]>]> | undefined
    for (const elem of holders) {
      const n = elem.get(1).get(0)
      if (min == null) {
        min = n
        minElem = elem
      } else {
        if (n < min) {
          min = n
          minElem = elem
        }
      }
    }
    return minElem!
  }
}

export class ReentrantLockState {
  constructor(
    readonly epoch: number,
    readonly holder: Maybe<FiberId>,
    readonly holdCount: number,
    readonly waiters: HashMap<FiberId, Tuple<[number, Deferred<never, void>]>>
  ) {}
}
