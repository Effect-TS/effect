import type * as HKT from "../HKT"

export interface None<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly never: <
    N extends string,
    K = unknown,
    SI = unknown,
    SO = unknown,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >() => HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, never>
}
