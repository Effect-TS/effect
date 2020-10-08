import type * as HKT from "../HKT"

export interface Id<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly id: <
    A,
    N extends string = HKT.Initial<C, "N">,
    K = HKT.Initial<C, "K">,
    Q = HKT.Initial<C, "Q">,
    W = HKT.Initial<C, "W">,
    X = HKT.Initial<C, "X">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >() => HKT.Kind<F, C, N, K, Q, W, X, A, S, R, E, A>
}
