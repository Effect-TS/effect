import type * as HKT from "../HKT"

// (A -> B) -> F<A> -> F<B>
export interface Covariant<F extends HKT.HKT> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <X = any, I = any, R = unknown, E = never>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => HKT.Kind<F, X, I, R, E, B>
}
