/* adapted from https://github.com/rzeigler/waveguide */

import * as T from "../Effect"
import * as Ex from "../Exit"
import { Completable, makeCompletable } from "../Support/Completable"

export interface Deferred<S, R, E, A> {
  /**
   * Wait for this deferred to complete.
   *
   * This Stack will produce the value set by done, raise the error set by error or interrupt
   */
  readonly wait: T.AsyncRE<R, E, A>
  /**
   * Interrupt any waitersa on this Deferred
   */
  interrupt: T.Sync<void>
  /**
   * Complete this Deferred with a value
   *
   * Any waiters will receive it
   * @param a
   */
  done(a: A): T.Sync<void>
  /**
   *
   * @param e Complete this deferred with an error
   *
   * Any waiters will produce an error
   */
  error(e: E): T.Sync<void>

  /**
   * Complete this Deferred with an abort
   *
   * Any waiters will produce an error
   * @param e
   */
  abort(e: unknown): T.Sync<void>

  /**
   * Complete this deferred with the given cuase
   * @param c
   */
  cause(c: Ex.Cause<E>): T.Sync<void>

  /**
   * complete this Defered with the provide exit status
   * @param e
   */
  complete(e: Ex.Exit<E, A>): T.Sync<void>

  /**
   * Set this deferred with the result of source
   * @param source
   */
  from(source: T.Effect<S, R, E, A>): T.Effect<S, unknown, never, void>
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
  wait: T.AsyncRE<R, E, A>
  interrupt: T.Sync<void>
  c: Completable<T.Effect<S, R, E, A>>
  causedBy: Ex.Cause<unknown> | undefined

  constructor(readonly r: R) {
    this.c = makeCompletable()

    this.wait = T.flatten(
      T.asyncTotal<T.Effect<S, R, E, A>>((callback) => this.c.listen(callback))
    )

    this.interrupt = T.sync(() => {
      this.c.complete(
        this.causedBy
          ? T.completed(Ex.causedBy(this.causedBy)(Ex.interrupt))
          : T.raiseInterrupt
      )
    })
  }

  done(a: A): T.Sync<void> {
    return T.sync(() => {
      this.c.complete(T.pure(a))
    })
  }

  error(e: E): T.Sync<void> {
    return T.sync(() => {
      this.c.complete(T.raiseError(e))
    })
  }

  abort(e: unknown): T.Sync<void> {
    return T.sync(() => {
      this.c.complete(T.raiseAbort(e))
    })
  }

  cause(e: Ex.Cause<E>): T.Sync<void> {
    return T.sync(() => {
      this.c.complete(T.raised(e))
    })
  }

  complete(exit: Ex.Exit<E, A>): T.Sync<void> {
    return T.sync(() => {
      this.c.complete(T.completed(exit))
    })
  }

  from(source: T.Effect<S, R, E, A>): T.Effect<S, unknown, never, void> {
    const completed = T.chain_(T.result(T.provide(this.r as R)(source)), (e) =>
      this.complete(e)
    )
    return T.onInterruptedExit_(completed, (int) => {
      if (int.causedBy._tag === "Some") {
        this.causedBy = int.causedBy.value
      }
      return this.interrupt
    })
  }
}

export function makeDeferred<S, R, E, A, E2 = never>(): T.Effect<
  never,
  R,
  E2,
  Deferred<S, R, E, A>
> {
  return T.access((r: R) => new DeferredImpl(r))
}
