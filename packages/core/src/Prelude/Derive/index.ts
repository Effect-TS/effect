// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Derive<F extends HKT.URIS, Typeclass extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _Derive: "Derive"
  readonly derive: <K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<Typeclass, C, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<
    Typeclass,
    C,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  >
}
