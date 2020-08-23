import type * as HKT from "../HKT"

export interface Any<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly any: <
    N extends string,
    K,
    SI,
    SO,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >() => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, any>
}
