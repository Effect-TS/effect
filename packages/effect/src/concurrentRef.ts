import { function as F } from "fp-ts";
import * as T from "./effect";
import { makeSemaphore } from "./semaphore";
import { pipe } from "fp-ts/lib/pipeable";

export interface ConcurrentRef<A> {
  /**
   * Get the current value of the ConcurrentRef
   */
  readonly get: T.Effect<T.NoEnv, never, A>;
  /**
   * Set the current value of the ConcurrentRef
   * @param a
   */
  set<R>(a: T.Effect<R, never, A>): T.Effect<R, never, A>;
  /**
   * Update the current value of the ConcurrentRef with an effect.
   * Produces the new value
   * @param f
   */
  update<R>(f: F.FunctionN<[A], T.Effect<R, never, A>>): T.Effect<R, never, A>;
  /**
   * Update the current value of a ConcurrentRef with an effect.
   *
   * This function may return a second value of type B that will be produced on complete
   * @param f
   */
  modify<R, B>(
    f: F.FunctionN<[A], T.Effect<R, never, readonly [B, A]>>
  ): T.Effect<R, never, B>;
}

/**
 * Creates an IO that will allocate a ConcurrentRef.
 */
export const makeConcurrentRef = <A>(
  initial: A
): T.Effect<T.NoEnv, never, ConcurrentRef<A>> =>
  pipe(
    makeSemaphore(1),
    T.map(semaphore => {
      let value = initial;

      const get = T.sync(() => value);

      const set = <R>(a: T.Effect<R, never, A>): T.Effect<R, never, A> =>
        semaphore.withPermit(
          T.effect.map(a, a => {
            const prev = value;
            value = a;
            return prev;
          })
        );

      const update = <R>(
        f: F.FunctionN<[A], T.Effect<R, never, A>>
      ): T.Effect<R, never, A> =>
        semaphore.withPermit(
          T.effect.map(
            T.effect.chain(
              T.sync(() => value),
              f
            ),
            v => {
              value = v;
              return v;
            }
          )
        );

      const modify = <R, B>(
        f: F.FunctionN<[A], T.Effect<R, never, readonly [B, A]>>
      ): T.Effect<R, never, B> =>
        semaphore.withPermit(
          T.effect.map(
            T.effect.chain(
              T.sync(() => value),
              f
            ),
            v => {
              const [b, a] = v;
              value = a;
              return b;
            }
          )
        );

      return {
        get,
        set,
        update,
        modify
      };
    })
  );
