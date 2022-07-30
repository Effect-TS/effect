import { DeferredState } from "@effect/core/io/Deferred/_internal/DeferredState"

export const DeferredSym = Symbol.for("@effect/core/io/Deferred")
export type DeferredSym = typeof DeferredSym

export const _E = Symbol.for("@effect/core/io/Deferred/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/io/Deferred/A")
export type _A = typeof _A

/**
 * A `Deferred` represents an asynchronous variable that can be set exactly
 * once, with the ability for an arbitrary number of fibers to suspend (by
 * calling `await`) and automatically resume when the variable is set.
 *
 * `Deferred` can be used for building primitive actions whose completions
 * require the coordinated action of multiple fibers, and for building
 * higher-level concurrent or asynchronous structures.
 *
 * @tsplus type effect/core/io/Deferred
 */
export interface Deferred<E, A> extends DeferredInternal<E, A> {}

/**
 * @tsplus type effect/core/io/Deferred.Aspects
 */
export interface DeferredAspects {}

/**
 * @tsplus type effect/core/io/Deferred.Ops
 */
export interface DeferredOps {
  readonly $: DeferredAspects
}

export const Deferred: DeferredOps = {
  $: {}
}

function interruptJoiner<E, A>(
  self: Deferred<E, A>,
  joiner: (a: Effect.IO<E, A>) => void,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return Effect.sync(() => {
    const state = self.state.get
    if (state._tag === "Pending") {
      self.state.set(DeferredState.pending(state.joiners.filter((j) => j !== joiner)))
    }
  })
}

export class DeferredInternal<E, A> {
  readonly [DeferredSym]: DeferredSym = DeferredSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A

  constructor(
    readonly state: AtomicReference<DeferredState<E, A>>,
    readonly blockingOn: FiberId
  ) {}

  /**
   * Retrieves the value of the promise, suspending the fiber running the action
   * until the result is available.
   */
  await<E, A>(this: Deferred<E, A>, __tsplusTrace?: string | undefined): Effect<never, E, A> {
    return Effect.asyncInterruptBlockingOn((k) => {
      const state = this.state.get

      switch (state._tag) {
        case "Done": {
          return Either.right(state.value)
        }
        case "Pending": {
          this.state.set(DeferredState.pending([k, ...state.joiners]))
          return Either.left(interruptJoiner(this, k))
        }
      }
    }, this.blockingOn)
  }

  /**
   * Completes the deferred with the result of the specified effect. If the
   * deferred has already been completed, the method will produce false.
   *
   * Note that `Deferred.completeWith` will be much faster, so consider using
   * that if you do not need to memoize the result of the specified effect.
   */
  complete<E, A>(
    this: Deferred<E, A>,
    effect: Effect<never, E, A>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return effect.intoDeferred(this)
  }

  /**
   * Completes the deferred with the result of the specified effect. If the
   * deferred has already been completed, the method will produce false.
   *
   * Note that `Deferred.completeWith` will be much faster, so consider using
   * that if you do not need to memoize the result of the specified effect.
   */
  completeWith<E, A>(
    this: Deferred<E, A>,
    effect: Effect<never, E, A>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return Effect.sync(() => {
      const state = this.state.get
      switch (state._tag) {
        case "Done": {
          return false
        }
        case "Pending": {
          this.state.set(DeferredState.done(effect))
          state.joiners.forEach((f) => {
            f(effect)
          })
          return true
        }
      }
    })
  }

  /**
   * Kills the promise with the specified error, which will be propagated to all
   * fibers waiting on the value of the promise.
   */
  die<E, A>(
    this: Deferred<E, A>,
    defect: LazyArg<unknown>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return this.completeWith(Effect.die(defect))
  }

  /**
   * Exits the deferred with the specified exit, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  done<E, A>(
    this: Deferred<E, A>,
    exit: LazyArg<Exit<E, A>>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return this.completeWith(Effect.done(exit))
  }

  /**
   * Fails the deferred with the specified error, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  fail<E, A>(this: Deferred<E, A>, e: LazyArg<E>, __tsplusTrace?: string | undefined): Effect<never, never, boolean> {
    return this.completeWith(Effect.failSync(e), __tsplusTrace)
  }

  /**
   * Fails the deferred with the specified cause, which will be propagated to all
   * fibers waiting on the value of the deferred.
   */
  failCause<E, A>(
    this: Deferred<E, A>,
    cause: LazyArg<Cause<E>>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return this.completeWith(Effect.failCauseSync(cause))
  }

  /**
   * Completes the deferred with interruption. This will interrupt all fibers
   * waiting on the value of the deferred as by the fiber calling this method.
   */
  interrupt<E, A>(this: Deferred<E, A>, __tsplusTrace?: string | undefined): Effect<never, never, boolean> {
    return Effect.fiberId.flatMap((id) => this.completeWith(Effect.interruptAs(id)))
  }

  /**
   * Completes the deferred with interruption. This will interrupt all fibers
   * waiting on the value of the deferred as by the fiber calling this method.
   */
  interruptAs<E, A>(
    this: Deferred<E, A>,
    fiberId: LazyArg<FiberId>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return this.completeWith(Effect.interruptAs(fiberId))
  }

  /**
   * Checks for completion of this `Promise`. Produces true if this promise has
   * already been completed with a value or an error and false otherwise.
   */
  isDone<E, A>(this: Deferred<E, A>, __tsplusTrace?: string | undefined): Effect<never, never, boolean> {
    return Effect.sync(this.state.get._tag === "Done")
  }

  /**
   * Checks for completion of this `Deferred`. Returns the result effect if this
   * deferred has already been completed or a `None` otherwise.
   */
  poll<E, A>(
    this: Deferred<E, A>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, Maybe<Effect<never, E, A>>> {
    return Effect.sync(() => {
      const state = this.state.get
      switch (state._tag) {
        case "Pending": {
          return Maybe.none
        }
        case "Done": {
          return Maybe.some(state.value)
        }
      }
    })
  }

  /**
   * Completes the deferred with the specified value.
   */
  succeed<E, A>(
    this: Deferred<E, A>,
    value: LazyArg<A>,
    __tsplusTrace?: string | undefined
  ): Effect<never, never, boolean> {
    return this.completeWith(Effect.sync(value))
  }

  /**
   * Unsafe version of `done`.
   */
  unsafeDone<E, A>(this: Deferred<E, A>, effect: Effect<never, E, A>): void {
    const state = this.state.get
    if (state._tag === "Pending") {
      this.state.set(DeferredState.done(effect))
      Array.from(state.joiners)
        .reverse()
        .forEach((f) => {
          f(effect)
        })
    }
  }
}
