// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface CovariantWithIndex<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _CovariantWithIndex: "CovariantWithIndex"
  readonly mapWithIndex: <K, A, B>(
    f: (k: HKT.IndexFor<F, HKT.OrFix<"K", C, K>>, a: A) => B
  ) => <W, Q, X, I, S, R, E>(
    fa: HKT.Kind<F, C, K, W, Q, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, W, Q, X, I, S, R, E, B>
}
