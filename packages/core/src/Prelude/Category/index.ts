// ets_tracing: off

import type { AssociativeCompose } from "../AssociativeCompose/index.js"
import type * as HKT from "../HKT/index.js"

export interface Category<F extends HKT.URIS, C = HKT.Auto>
  extends AssociativeCompose<F, C> {
  readonly id: <
    A,
    K = HKT.Initial<C, "K">,
    Q = HKT.Initial<C, "Q">,
    W = HKT.Initial<C, "W">,
    X = HKT.Initial<C, "X">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >() => HKT.Kind<F, C, K, Q, W, X, A, S, R, E, A>
}
