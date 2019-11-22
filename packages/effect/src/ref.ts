/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/ref.ts
  credits to original author
 */

import { FunctionN } from "fp-ts/lib/function";
import * as T from "./";

export interface Ref<A> {
  readonly get: T.Effect<T.NoEnv, never, A>;

  set(a: A): T.Effect<T.NoEnv, never, A>;

  update(f: FunctionN<[A], A>): T.Effect<T.NoEnv, never, A>;

  modify<B>(f: FunctionN<[A], readonly [B, A]>): T.Effect<T.NoEnv, never, B>;
}

export function makeRef<A>(initial: A): T.Effect<T.NoEnv, never, Ref<A>> {
  return T.fromIO(() => {
    let value = initial;

    const get = T.fromIO(() => value);

    const set = (a: A): T.Effect<T.NoEnv, never, A> =>
      T.fromIO(() => {
        const prev = value;
        value = a;
        return prev;
      });

    const update = (f: FunctionN<[A], A>): T.Effect<T.NoEnv, never, A> =>
      T.fromIO(() => {
        return (value = f(value));
      });

    const modify = <B>(
      f: FunctionN<[A], readonly [B, A]>
    ): T.Effect<T.NoEnv, never, B> =>
      T.fromIO(() => {
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
}
