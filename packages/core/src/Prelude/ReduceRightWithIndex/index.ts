// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface ReduceRightWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _ReduceRightWithIndex: "ReduceRightWithIndex"
  readonly reduceRightWithIndex: ReduceRightWithIndexFn<F, C>
}

export interface ReduceRightWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <K, A, B>(b: B, f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, a: A, b: B) => B): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => B
}
