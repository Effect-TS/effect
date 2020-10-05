import type * as HKT from "../HKT"

export interface Id<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly id: <
    A,
    N extends string = HKT.Initial<C, "N">,
    K = HKT.Initial<C, "N">,
    Q = HKT.Initial<C, "N">,
    W = HKT.Initial<C, "N">,
    X = HKT.Initial<C, "N">,
    I = HKT.Initial<C, "N">,
    S = HKT.Initial<C, "N">,
    R = HKT.Initial<C, "N">
  >() => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, A, A>
}
