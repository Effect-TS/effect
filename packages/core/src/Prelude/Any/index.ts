// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Any<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Any: "Any"
  readonly any: <
    K = HKT.Initial<C, "K">,
    Q = HKT.Initial<C, "Q">,
    W = HKT.Initial<C, "W">,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >() => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, unknown>
}
