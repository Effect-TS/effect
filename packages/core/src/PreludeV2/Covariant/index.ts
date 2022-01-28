import type * as HKT from "../HKT"

// (A -> B) -> F<A> -> F<B>
export interface Covariant<F extends HKT.HKT> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <X = any, I = any, S = any, R = unknown, E = never>(
    fa: HKT.Kind<F, X, I, S, R, E, A>
  ) => HKT.Kind<F, X, I, S, R, E, B>
}
