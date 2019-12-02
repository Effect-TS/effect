/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/ref.ts
 */

import { FunctionN } from "fp-ts/lib/function";
import * as T from "./effect";

export interface Ref<A> {
  /**
   * Get the current value of the Ref
   */
  readonly get: T.Effect<T.NoEnv, never, A>;
  /**
   * Set the current value of the ref
   * @param a
   */
  set(a: A): T.Effect<T.NoEnv, never, A>;
  /**
   * Update the current value of the ref with a function.
   * Produces the new value
   * @param f
   */
  update(f: FunctionN<[A], A>): T.Effect<T.NoEnv, never, A>;
  /**
   * Update the current value of a ref with a function.
   *
   * This function may return a second value of type B that will be produced on complete
   * @param f
   */
  modify<B>(f: FunctionN<[A], readonly [B, A]>): T.Effect<T.NoEnv, never, B>;
}

/**
 * Creates an IO that will allocate a Ref.
 * Curried form of makeRef_ to allow for inference on the initial type
 */
export const makeRef = <A>(initial: A): T.Effect<T.NoEnv, never, Ref<A>> =>
  T.sync(() => {
    let value = initial;

    const get = T.sync(() => value);

    const set = (a: A): T.Effect<T.NoEnv, never, A> =>
      T.sync(() => {
        const prev = value;
        value = a;
        return prev;
      });

    const update = (f: FunctionN<[A], A>): T.Effect<T.NoEnv, never, A> =>
      T.sync(() => {
        return (value = f(value));
      });

    const modify = <B>(
      f: FunctionN<[A], readonly [B, A]>
    ): T.Effect<T.NoEnv, never, B> =>
      T.sync(() => {
        const [b, a] = f(value);
        value = a;
        return b;
      });

    return {
      get,
      set,
      update,
      modify
    };
  });
