// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface ReduceRight<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _ReduceRight: "ReduceRight"
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => B
}
