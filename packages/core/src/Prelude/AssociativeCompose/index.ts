// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface AssociativeCompose<F extends HKT.URIS, TC = HKT.Auto>
  extends HKT.Base<F, TC> {
  readonly _AssociativeCompose: "AssociativeCompose"
  readonly compose: <
    B,
    C,
    K = HKT.Initial<TC, "K">,
    Q = HKT.Initial<TC, "Q">,
    W = HKT.Initial<TC, "W">,
    X = HKT.Initial<TC, "X">,
    S = HKT.Initial<TC, "S">,
    R = HKT.Initial<TC, "R">,
    E = HKT.Initial<TC, "E">
  >(
    ab: HKT.Kind<F, TC, K, Q, W, X, B, S, R, E, C>
  ) => <
    A,
    K2 = HKT.Initial<TC, "K">,
    Q2 = HKT.Initial<TC, "Q">,
    W2 = HKT.Initial<TC, "W">,
    X2 = HKT.Initial<TC, "X">,
    S2 = HKT.Initial<TC, "S">,
    R2 = HKT.Initial<TC, "R">,
    E2 = HKT.Initial<TC, "E">
  >(
    bc: HKT.Kind<
      F,
      TC,
      HKT.Intro<TC, "K", K, K2>,
      HKT.Intro<TC, "Q", Q, Q2>,
      HKT.Intro<TC, "W", W, W2>,
      HKT.Intro<TC, "X", X, X2>,
      A,
      HKT.Intro<TC, "S", S, S2>,
      HKT.Intro<TC, "R", R, R2>,
      HKT.Intro<TC, "E", E, E2>,
      B
    >
  ) => HKT.Kind<
    F,
    TC,
    HKT.Mix<TC, "K", [K, K2]>,
    HKT.Mix<TC, "Q", [Q, Q2]>,
    HKT.Mix<TC, "W", [W, W2]>,
    HKT.Mix<TC, "X", [X, X2]>,
    A,
    HKT.Mix<TC, "S", [S, S2]>,
    HKT.Mix<TC, "R", [R, R2]>,
    HKT.Mix<TC, "E", [E, E2]>,
    C
  >
}
