import { Exit, Cause } from "../Exit"
import { EffectTypes, Effect } from "../Support/Common"
import {
  asyncTotal,
  flatten,
  sync,
  raiseInterrupt,
  pure,
  raiseError,
  chain,
  result,
  provide,
  onInterrupted,
  completed,
  raiseAbort,
  raised,
  access
} from "../Support/Common/instructions"
import { Completable, makeCompletable } from "../Support/Completable"

export interface Deferred<S, R, E, A> {
  /**
   * Wait for this deferred to complete.
   *
   * This Stack will produce the value set by done, raise the error set by error or interrupt
   */
  readonly wait: EffectTypes.AsyncRE<R, E, A>
  /**
   * Interrupt any waitersa on this Deferred
   */
  interrupt: EffectTypes.Sync<void>
  /**
   * Complete this Deferred with a value
   *
   * Any waiters will receive it
   * @param a
   */
  done(a: A): EffectTypes.Sync<void>
  /**
   *
   * @param e Complete this deferred with an error
   *
   * Any waiters will produce an error
   */
  error(e: E): EffectTypes.Sync<void>

  /**
   * Complete this Deferred with an abort
   *
   * Any waiters will produce an error
   * @param e
   */
  abort(e: unknown): EffectTypes.Sync<void>

  /**
   * Complete this deferred with the given cuase
   * @param c
   */
  cause(c: Cause<E>): EffectTypes.Sync<void>

  /**
   * complete this Defered with the provide exit status
   * @param e
   */
  complete(e: Exit<E, A>): EffectTypes.Sync<void>

  /**
   * Set this deferred with the result of source
   * @param source
   */
  from(source: Effect<S, R, E, A>): Effect<S, unknown, never, void>
}

export type Async<A> = Deferred<unknown, unknown, never, A>
export type AsyncE<E, A> = Deferred<unknown, unknown, E, A>
export type AsyncR<R, A> = Deferred<unknown, R, never, A>
export type AsyncRE<R, E, A> = Deferred<unknown, R, E, A>

export type Sync<A> = Deferred<never, unknown, never, A>
export type SyncE<E, A> = Deferred<never, unknown, E, A>
export type SyncR<R, A> = Deferred<never, R, never, A>
export type SyncRE<R, E, A> = Deferred<never, R, E, A>

export class DeferredImpl<S, R, E, A> implements Deferred<S, R, E, A> {
  wait: EffectTypes.AsyncRE<R, E, A>
  interrupt: EffectTypes.Sync<void>
  c: Completable<Effect<S, R, E, A>>

  constructor(readonly r: R) {
    this.c = makeCompletable()

    this.wait = flatten(
      asyncTotal<Effect<S, R, E, A>>((callback) => this.c.listen(callback))
    )

    this.interrupt = sync(() => {
      this.c.complete(raiseInterrupt)
    })
  }

  done(a: A): EffectTypes.Sync<void> {
    return sync(() => {
      this.c.complete(pure(a))
    })
  }

  error(e: E): EffectTypes.Sync<void> {
    return sync(() => {
      this.c.complete(raiseError(e))
    })
  }

  abort(e: unknown): EffectTypes.Sync<void> {
    return sync(() => {
      this.c.complete(raiseAbort(e))
    })
  }

  cause(e: Cause<E>): EffectTypes.Sync<void> {
    return sync(() => {
      this.c.complete(raised(e))
    })
  }

  complete(exit: Exit<E, A>): EffectTypes.Sync<void> {
    return sync(() => {
      this.c.complete(completed(exit))
    })
  }

  from(source: Effect<S, R, E, A>): Effect<S, unknown, never, void> {
    const completed = chain(result(provide(this.r as R)(source)), (e) =>
      this.complete(e)
    )
    return onInterrupted(completed, this.interrupt)
  }
}

export function makeDeferred<S, R, E, A, E2 = never>(): Effect<
  never,
  R,
  E2,
  Deferred<S, R, E, A>
> {
  return access((r: R) => new DeferredImpl(r))
}
