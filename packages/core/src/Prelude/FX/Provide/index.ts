// ets_tracing: off

import type * as HKT from "../../HKT/index.js"

export interface Provide<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Provide: "Provide"
  readonly provide: <R>(
    r: R
  ) => <K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, K, Q, W, X, I, S, unknown, E, A>
}
