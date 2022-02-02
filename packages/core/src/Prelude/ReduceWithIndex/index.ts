// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface ReduceWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _ReduceWithIndex: "ReduceWithIndex"
  readonly reduceWithIndex: ReduceWithIndexFn<F, C>
}

export interface ReduceWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <K, A, B>(b: B, f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, b: B, a: A) => B): <
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
