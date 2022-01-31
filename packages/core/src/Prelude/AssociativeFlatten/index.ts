// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface AssociativeFlatten<F extends HKT.URIS, C = HKT.Auto>
  extends HKT.Base<F, C> {
  readonly _AssociativeFlatten: "AssociativeFlatten"
  readonly flatten: <K, Q, W, X, I, S, R, E, A, K2, Q2, W2, X2, I2, S2, R2, E2>(
    ffa: HKT.Kind<
      F,
      C,
      K2,
      Q2,
      W2,
      X2,
      I2,
      S2,
      R2,
      E2,
      HKT.Kind<
        F,
        C,
        HKT.Intro<C, "K", K2, K>,
        HKT.Intro<C, "Q", Q2, Q>,
        HKT.Intro<C, "W", W2, W>,
        HKT.Intro<C, "X", X2, X>,
        HKT.Intro<C, "I", I2, I>,
        HKT.Intro<C, "S", S2, S>,
        HKT.Intro<C, "R", R2, R>,
        HKT.Intro<C, "E", E2, E>,
        A
      >
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, "K", [K2, K]>,
    HKT.Mix<C, "Q", [Q2, Q]>,
    HKT.Mix<C, "W", [W2, W]>,
    HKT.Mix<C, "X", [X2, X]>,
    HKT.Mix<C, "I", [I2, I]>,
    HKT.Mix<C, "S", [S2, S]>,
    HKT.Mix<C, "R", [R2, R]>,
    HKT.Mix<C, "E", [E2, E]>,
    A
  >
}
