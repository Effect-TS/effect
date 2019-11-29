/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/deferred.ts
 */

import { Exit, Cause } from "waveguide/lib/exit";
import { Completable, completable } from "waveguide/lib/support/completable";
import * as T from "./";

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

/* tested in wave */
/* istanbul ignore next */
export function makeDeferred<R, E, A, E2 = never>(): T.Effect<
  R,
  E2,
  Deferred<R, E, A>
> {
  return T.accessM((r: R) =>
    T.sync(() => {
      const c: Completable<T.Effect<R, E, A>> = completable();
      const wait: T.Effect<R, E, A> = T.flatten(
        T.asyncTotal<T.Effect<R, E, A>>(callback => c.listen(callback)) as any // TODO: this is fine, typedoc thinks differently
      );

      const interrupt: T.Effect<T.NoEnv, T.NoErr, void> = T.sync(() => {
        c.complete(T.raiseInterrupt);
      });

      const done = (a: A): T.Effect<T.NoEnv, T.NoErr, void> =>
        T.sync(() => {
          c.complete(T.pure(a));
        });

      const error = (e: E): T.Effect<T.NoEnv, T.NoErr, void> =>
        T.sync(() => {
          c.complete(T.raiseError(e));
        });

      const abort = (e: unknown): T.Effect<T.NoEnv, T.NoErr, void> =>
        T.sync(() => {
          c.complete(T.raiseAbort(e));
        });

      const cause = (e: Cause<E>): T.Effect<T.NoEnv, T.NoErr, void> =>
        T.sync(() => {
          c.complete(T.raised(e));
        });

      const complete = (exit: Exit<E, A>): T.Effect<T.NoEnv, T.NoErr, void> =>
        T.sync(() => {
          c.complete(T.completed(exit));
        });

      const from = (
        source: T.Effect<R, E, A>
      ): T.Effect<T.NoEnv, T.NoErr, void> => {
        const completed = T.effect.chain(
          T.result(T.provideAll(r)(source)),
          complete
        );

        return T.onInterrupted(completed, interrupt);
      };

      return {
        wait,
        interrupt,
        done,
        error,
        abort,
        cause,
        complete,
        from
      };
    })
  );
}
