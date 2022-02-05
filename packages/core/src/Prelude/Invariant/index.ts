// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Invariant<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Invariant: "Invariant"
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, Q, W, X, I, S, R, E>(
      ma: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    g: <K, Q, W, X, I, S, R, E>(
      ma: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, B>
    ) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
  }
}
