/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/deferred.ts
 */

import { Exit, Cause } from "./original/exit";
import { Completable, CompletableImpl } from "./original/support/completable";
import * as T from "./effect";
import { effect } from "./effect";

/* tested in wave */
/* istanbul ignore file */

export interface Deferred<R, E, A> {
  /**
   * Wait for this deferred to complete.
   *
   * This Stack will produce the value set by done, raise the error set by error or interrupt
   */
  readonly wait: T.Effect<R, E, A>;
  /**
   * Interrupt any waitersa on this Deferred
   */
  interrupt: T.Effect<T.NoEnv, T.NoErr, void>;
  /**
   * Complete this Deferred with a value
   *
   * Any waiters will receive it
   * @param a
   */
  done(a: A): T.Effect<T.NoEnv, T.NoErr, void>;
  /**
   *
   * @param e Complete this deferred with an error
   *
   * Any waiters will produce an error
   */
  error(e: E): T.Effect<T.NoEnv, T.NoErr, void>;

  /**
   * Complete this Deferred with an abort
   *
   * Any waiters will produce an error
   * @param e
   */
  abort(e: unknown): T.Effect<T.NoEnv, T.NoErr, void>;

  /**
   * Complete this deferred with the given cuase
   * @param c
   */
  cause(c: Cause<E>): T.Effect<T.NoEnv, T.NoErr, void>;

  /**
   * complete this Defered with the provide exit status
   * @param e
   */
  complete(e: Exit<E, A>): T.Effect<T.NoEnv, T.NoErr, void>;

  /**
   * Set this deferred with the result of source
   * @param source
   */
  from(source: T.Effect<R, E, A>): T.Effect<T.NoEnv, T.NoErr, void>;
}

export class DeferredImpl<R, E, A> implements Deferred<R, E, A> {
  wait: T.Effect<R, E, A>;
  interrupt: T.Effect<T.NoEnv, T.NoErr, void>;
  c: Completable<T.Effect<R, E, A>>;

  constructor(readonly r: R) {
    this.c = new CompletableImpl();

    this.wait = T.flatten(
      T.asyncTotal<T.Effect<R, E, A>>((callback) => this.c.listen(callback))
    );

    this.interrupt = T.sync(() => {
      this.c.complete(T.raiseInterrupt);
    });
  }

  done(a: A): T.Effect<T.NoEnv, T.NoErr, void> {
    return T.sync(() => {
      this.c.complete(T.pure(a));
    });
  }

  error(e: E): T.Effect<T.NoEnv, T.NoErr, void> {
    return T.sync(() => {
      this.c.complete(T.raiseError(e));
    });
  }

  abort(e: unknown): T.Effect<T.NoEnv, T.NoErr, void> {
    return T.sync(() => {
      this.c.complete(T.raiseAbort(e));
    });
  }

  cause(e: Cause<E>): T.Effect<T.NoEnv, T.NoErr, void> {
    return T.sync(() => {
      this.c.complete(T.raised(e));
    });
  }

  complete(exit: Exit<E, A>): T.Effect<T.NoEnv, T.NoErr, void> {
    return T.sync(() => {
      this.c.complete(T.completed(exit));
    });
  }

  from(source: T.Effect<R, E, A>): T.Effect<T.NoEnv, T.NoErr, void> {
    const completed = effect.chain(T.result(T.provide(this.r as R)(source)), (e) =>
      this.complete(e)
    );
    return T.effect.onInterrupted(completed, this.interrupt);
  }
}

export function makeDeferred<R, E, A, E2 = never>(): T.Effect<R, E2, Deferred<R, E, A>> {
  return T.access((r: R) => new DeferredImpl(r));
}
