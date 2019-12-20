import * as T from "./effect";
import { FunctionN } from "fp-ts/lib/function";

export type Patched<A, B> = B extends FunctionN<
  infer ARG,
  T.Effect<infer R, infer E, infer RET>
>
  ? FunctionN<ARG, T.Effect<R & A, E, RET>>
  : B extends T.Effect<infer R, infer E, infer RET>
  ? T.Effect<R & A, E, RET>
  : never;

export type Derived<A, S extends keyof A> = A extends { [k in S]: infer B }
  ? { [h in keyof B]: Patched<A, B[h]> }
  : never;

export function getDerived<A extends { [k in keyof A]: object }>(
  a: A,
  s: keyof A
): Derived<A, typeof s> {
  const derived = {} as Derived<A, typeof s>;

  for (const k of Reflect.ownKeys(a[s])) {
    if (typeof a[s][k] === "function") {
      derived[k] = (...args: any[]) =>
        T.accessM(({ [s]: am }: A) => am[k](...args));
    } else {
      derived[k] = T.accessM(({ [s]: am }: A) => am[k]);
    }
  }

  return derived;
}
