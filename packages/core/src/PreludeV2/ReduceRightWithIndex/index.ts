// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface ReduceRightWithIndex<K, F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly reduceRightWithIndex: ReduceRightWithIndexFn<K, F>
}

export interface ReduceRightWithIndexFn<K, F extends HKT.HKT> {
  <A, B>(b: B, f: (k: K, a: A, b: B) => B): <R, E>(fa: HKT.Kind<F, R, E, A>) => B
}
