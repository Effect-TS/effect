// ets_tracing: off

import type * as HKT from "../HKT"

export interface ReduceRightWithIndex<K, F extends HKT.HKT> {
  readonly reduceRightWithIndex: ReduceRightWithIndexFn<K, F>
}

export interface ReduceRightWithIndexFn<K, F extends HKT.HKT> {
  <K, A, B>(b: B, f: (k: K, a: A, b: B) => B): <X, I, R, E>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => B
}
