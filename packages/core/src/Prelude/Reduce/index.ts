// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Reduce<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Reduce: "Reduce"
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
  ) => <K, Q, W, X, I, S, R, E>(fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>) => B
}
